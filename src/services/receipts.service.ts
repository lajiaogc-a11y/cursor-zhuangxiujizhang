/**
 * Receipts Service
 * 票据/附件存储管理服务
 */

import { supabase, handleSupabaseError } from './base';

export interface StorageFile {
  id: string;
  name: string;
  path: string;
  size: number;
  created_at: string;
  isOrphan: boolean;
  linkedTo?: string;
}

/**
 * Recursively list all files in the receipts storage bucket
 */
async function fetchFolderContents(prefix: string): Promise<StorageFile[]> {
  const allFiles: StorageFile[] = [];
  const { data, error } = await supabase.storage
    .from('receipts')
    .list(prefix, { limit: 1000 });

  if (error || !data) return allFiles;

  for (const item of data) {
    if (item.id === null) {
      // Folder - recurse
      const subFiles = await fetchFolderContents(prefix ? `${prefix}/${item.name}` : item.name);
      allFiles.push(...subFiles);
    } else {
      allFiles.push({
        id: item.id,
        name: item.name,
        path: prefix ? `${prefix}/${item.name}` : item.name,
        size: (item.metadata as any)?.size || 0,
        created_at: item.created_at || '',
        isOrphan: true,
        linkedTo: undefined,
      });
    }
  }

  return allFiles;
}

/**
 * Fetch all receipt file references from DB tables
 */
async function fetchUsedPaths(): Promise<Set<string>> {
  const [transactionsResult, paymentsResult, expensesResult] = await Promise.all([
    supabase.from('transactions').select('receipt_url_1, receipt_url_2'),
    supabase.from('project_payments').select('receipt_url'),
    supabase.from('project_expenses').select('receipt_url'),
  ]);

  const usedPaths = new Set<string>();

  transactionsResult.data?.forEach(tx => {
    if (tx.receipt_url_1) usedPaths.add(tx.receipt_url_1);
    if (tx.receipt_url_2) usedPaths.add(tx.receipt_url_2);
  });

  paymentsResult.data?.forEach(p => {
    if (p.receipt_url) usedPaths.add(p.receipt_url);
  });

  expensesResult.data?.forEach(e => {
    if (e.receipt_url) usedPaths.add(e.receipt_url);
  });

  return usedPaths;
}

/**
 * Fetch all storage files with orphan status
 */
export async function fetchReceiptFiles(linkedLabels: {
  transaction: string;
  payment: string;
  expense: string;
  other: string;
}): Promise<StorageFile[]> {
  const [allFiles, usedPaths] = await Promise.all([
    fetchFolderContents(''),
    fetchUsedPaths(),
  ]);

  return allFiles.map(file => {
    const isOrphan = !usedPaths.has(file.path);
    let linkedTo: string | undefined;

    if (!isOrphan) {
      if (file.path.includes('transactions/')) linkedTo = linkedLabels.transaction;
      else if (file.path.includes('payments/')) linkedTo = linkedLabels.payment;
      else if (file.path.includes('expenses/')) linkedTo = linkedLabels.expense;
      else linkedTo = linkedLabels.other;
    }

    return { ...file, isOrphan, linkedTo };
  });
}

/**
 * Delete a single file from receipts storage
 */
export async function deleteReceiptFile(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from('receipts').remove([path]);
  return !error;
}

/**
 * Batch delete files, returns { deleted, errors }
 */
export async function batchDeleteReceiptFiles(
  paths: string[],
  onProgress?: (percent: number) => void,
  shouldCancel?: () => boolean
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;

  for (let i = 0; i < paths.length; i++) {
    if (shouldCancel?.()) break;

    const success = await deleteReceiptFile(paths[i]);
    if (success) deleted++;
    else errors++;

    onProgress?.(Math.round(((i + 1) / paths.length) * 100));
  }

  return { deleted, errors };
}

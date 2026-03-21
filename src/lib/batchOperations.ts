/**
 * 批量数据操作工具函数
 * 用于优化大量数据的导入和删除性能
 * 
 * Re-exports batch operations from service layer.
 */

import { supabase } from '@/integrations/supabase/client';

// 批量插入配置
const BATCH_SIZE = 100;
const CONCURRENT_BATCHES = 3;

export interface BatchResult {
  success: boolean;
  inserted?: number;
  deleted?: number;
  errors: string[];
}

/**
 * 批量插入数据
 */
export async function batchInsert<T extends Record<string, any>>(
  table: string,
  data: T[],
  onProgress?: (progress: number) => void
): Promise<BatchResult> {
  if (data.length === 0) {
    return { success: true, inserted: 0, errors: [] };
  }

  const errors: string[] = [];
  let insertedCount = 0;

  const batches: T[][] = [];
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    batches.push(data.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    const concurrentBatches = batches.slice(i, i + CONCURRENT_BATCHES);
    
    const results = await Promise.allSettled(
      concurrentBatches.map(async (batch) => {
        const { error, data: insertedData } = await supabase
          .from(table as any)
          .insert(batch as any)
          .select('id');
        
        if (error) throw new Error(error.message);
        return insertedData?.length || batch.length;
      })
    );

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        insertedCount += result.value;
      } else {
        errors.push(result.reason?.message || 'Unknown error');
      }
    });

    if (onProgress) {
      const progress = Math.min(100, Math.round(((i + concurrentBatches.length) / batches.length) * 100));
      onProgress(progress);
    }
  }

  return { success: errors.length === 0, inserted: insertedCount, errors };
}

/**
 * 批量删除数据
 */
export async function batchDelete(
  table: string,
  onProgress?: (deleted: number) => void
): Promise<BatchResult> {
  const errors: string[] = [];
  let totalDeleted = 0;
  const DELETE_BATCH_SIZE = 500;

  try {
    let hasMore = true;
    while (hasMore) {
      const { data: records, error: selectError } = await supabase
        .from(table as any)
        .select('id')
        .limit(DELETE_BATCH_SIZE) as { data: { id: string }[] | null; error: any };

      if (selectError) { errors.push(`Select error: ${selectError.message}`); break; }
      if (!records || records.length === 0) { hasMore = false; break; }

      const ids = records.map((r: { id: string }) => r.id);
      const { error: deleteError } = await supabase.from(table as any).delete().in('id', ids);

      if (deleteError) { errors.push(`Delete error: ${deleteError.message}`); break; }

      totalDeleted += records.length;
      if (onProgress) onProgress(totalDeleted);
      if (records.length < DELETE_BATCH_SIZE) hasMore = false;
    }
  } catch (error: any) {
    errors.push(error.message || 'Unknown error during batch delete');
  }

  return { success: errors.length === 0, deleted: totalDeleted, errors };
}

/**
 * 并行删除多个表
 */
export async function parallelDelete(
  tables: string[],
  onTableComplete?: (table: string, result: BatchResult) => void
): Promise<Map<string, BatchResult>> {
  const results = new Map<string, BatchResult>();
  const deletePromises = tables.map(async (table) => {
    const result = await batchDelete(table);
    results.set(table, result);
    if (onTableComplete) onTableComplete(table, result);
    return { table, result };
  });
  await Promise.allSettled(deletePromises);
  return results;
}

/**
 * 按依赖顺序删除表
 */
export async function orderedBatchDelete(
  deletionGroups: string[][],
  onProgress?: (table: string, deleted: number) => void,
  onGroupComplete?: (groupIndex: number, results: Map<string, BatchResult>) => void
): Promise<Map<string, BatchResult>> {
  const allResults = new Map<string, BatchResult>();

  for (let i = 0; i < deletionGroups.length; i++) {
    const group = deletionGroups[i];
    const groupResults = await parallelDelete(group, (table, result) => {
      if (onProgress && result.deleted) onProgress(table, result.deleted);
    });
    groupResults.forEach((result, table) => allResults.set(table, result));
    if (onGroupComplete) onGroupComplete(i, groupResults);
  }

  return allResults;
}

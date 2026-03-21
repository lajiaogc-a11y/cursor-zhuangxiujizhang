/**
 * Bank Reconciliation Service
 * 银行对账数据服务
 */

import { supabase, handleSupabaseError } from './base';

// ══════════════════════════════════════
// Fetch
// ══════════════════════════════════════

export async function fetchStatements(tenantId: string) {
  const { data, error } = await supabase
    .from('bank_statements' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('statement_date', { ascending: false })
    .limit(500);
  if (error) handleSupabaseError(error);
  return (data as any[]) || [];
}

export async function fetchBatches(tenantId: string) {
  const { data, error } = await supabase
    .from('bank_import_batches' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('imported_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data as any[]) || [];
}

// ══════════════════════════════════════
// Import
// ══════════════════════════════════════

export async function importBatch(params: {
  fileName: string;
  currency: string;
  accountType: string;
  totalRecords: number;
  userId: string | undefined;
  tenantId: string;
  rows: Array<{
    statement_date: string;
    description: string;
    debit_amount: number;
    credit_amount: number;
    balance: number;
  }>;
}) {
  const { data: batch, error: batchErr } = await supabase
    .from('bank_import_batches' as any)
    .insert({
      file_name: params.fileName,
      account_currency: params.currency,
      account_type: params.accountType,
      total_records: params.totalRecords,
      imported_by: params.userId,
      tenant_id: params.tenantId,
    } as any)
    .select()
    .single();
  if (batchErr) handleSupabaseError(batchErr);

  const insertRows = params.rows.map(r => ({
    import_batch_id: (batch as any).id,
    account_currency: params.currency,
    account_type: params.accountType,
    tenant_id: params.tenantId,
    created_by: params.userId,
    ...r,
  }));

  const { error: insertErr } = await supabase
    .from('bank_statements' as any)
    .insert(insertRows as any);
  if (insertErr) handleSupabaseError(insertErr);
}

// ══════════════════════════════════════
// Matching
// ══════════════════════════════════════

export async function fetchMatchCandidates(tenantId: string) {
  const [txRes, rulesRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, transaction_date, amount, amount_myr, currency, account_type, type, summary, category_name')
      .eq('tenant_id', tenantId)
      .order('transaction_date', { ascending: false })
      .limit(1000),
    supabase
      .from('reconciliation_rules' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
  ]);
  return {
    transactions: txRes.data || [],
    rules: (rulesRes.data as any[]) || [],
  };
}

export async function fetchPossibleMatches(tenantId: string, stmt: any) {
  const amount = stmt.debit_amount > 0 ? stmt.debit_amount : stmt.credit_amount;
  const txType = stmt.debit_amount > 0 ? 'expense' : 'income';
  const { data } = await supabase
    .from('transactions')
    .select('id, transaction_date, amount, currency, account_type, type, summary, category_name')
    .eq('tenant_id', tenantId)
    .eq('type', txType)
    .eq('currency', stmt.account_currency)
    .gte('transaction_date', new Date(new Date(stmt.statement_date).getTime() - 3 * 86400000).toISOString().split('T')[0])
    .lte('transaction_date', new Date(new Date(stmt.statement_date).getTime() + 3 * 86400000).toISOString().split('T')[0])
    .order('transaction_date', { ascending: false })
    .limit(20);
  return (data || []).sort((a, b) => Math.abs(Number(a.amount) - amount) - Math.abs(Number(b.amount) - amount));
}

export async function updateStatementMatch(stmtId: string, matchStatus: string, matchedTransactionId: string | null) {
  const { error } = await supabase
    .from('bank_statements' as any)
    .update({ match_status: matchStatus, matched_transaction_id: matchedTransactionId } as any)
    .eq('id', stmtId);
  if (error) handleSupabaseError(error);
}

export async function deleteBatch(batchId: string) {
  const { error } = await supabase
    .from('bank_import_batches' as any)
    .delete()
    .eq('id', batchId);
  if (error) handleSupabaseError(error);
}

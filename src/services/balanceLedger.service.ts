/**
 * Balance Ledger Service
 * 
 * 余额明细页的数据访问层。
 * 包含实时余额计算、分页交易查询、运行余额计算。
 */

import { supabase, handleSupabaseError, requireTenantId } from './base';
import type { PaginationParams } from './base';
import { format } from 'date-fns';

export interface CalculatedBalances {
  MYR: { cash: number; bank: number; total: number };
  CNY: { cash: number; bank: number; total: number };
  USD: { cash: number; bank: number; total: number };
}

export interface TransactionWithBalance {
  id: string;
  sequence_no: number;
  transaction_date: string;
  type: string;
  category_name: string;
  summary: string;
  amount: number;
  currency: string;
  account_type: string;
  amount_myr: number;
  remark_1: string | null;
  balance_before?: number;
  balance_after?: number;
}

interface LedgerFilters {
  currency?: string;
  accountType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

const DEFAULT_BALANCES: CalculatedBalances = {
  MYR: { cash: 0, bank: 0, total: 0 },
  CNY: { cash: 0, bank: 0, total: 0 },
  USD: { cash: 0, bank: 0, total: 0 },
};

// ─── Calculated Balances ──────────────────────────────

export async function fetchCalculatedBalances(tenantId: string): Promise<CalculatedBalances> {
  requireTenantId(tenantId);
  const [txRes, accRes] = await Promise.all([
    supabase.from('transactions').select('type, amount, currency, account_type').eq('tenant_id', tenantId),
    supabase.from('company_accounts').select('currency, account_type, balance, include_in_stats').eq('tenant_id', tenantId),
  ]);

  const balances: CalculatedBalances = JSON.parse(JSON.stringify(DEFAULT_BALANCES));

  (accRes.data || []).forEach(acc => {
    if (acc.include_in_stats === false) return;
    const cur = acc.currency as keyof CalculatedBalances;
    const at = acc.account_type as 'cash' | 'bank';
    if (balances[cur]) {
      balances[cur][at] += Number(acc.balance || 0);
      balances[cur].total += Number(acc.balance || 0);
    }
  });

  (txRes.data || []).forEach(tx => {
    const cur = tx.currency as keyof CalculatedBalances;
    const at = tx.account_type as 'cash' | 'bank';
    if (balances[cur]) {
      const effect = tx.type === 'income' ? tx.amount : -tx.amount;
      balances[cur][at] += effect;
      balances[cur].total += effect;
    }
  });

  return balances;
}

// ─── Transactions with Running Balance ────────────────

export async function fetchLedgerTransactions(
  tenantId: string,
  filters: LedgerFilters,
  pagination: PaginationParams
): Promise<{ transactions: TransactionWithBalance[]; totalCount: number }> {
  requireTenantId(tenantId);

  const from = (pagination.page - 1) * pagination.pageSize;
  const to = from + pagination.pageSize - 1;

  let query = supabase.from('transactions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('transaction_date', { ascending: false })
    .order('sequence_no', { ascending: false })
    .range(from, to);

  if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo);
  if (filters.currency && filters.currency !== 'all') {
    query = query.eq('currency', filters.currency as 'MYR' | 'CNY' | 'USD');
  }
  if (filters.accountType && filters.accountType !== 'all') {
    query = query.eq('account_type', filters.accountType as 'cash' | 'bank');
  }
  if (filters.search?.trim()) {
    query = query.or(`summary.ilike.%${filters.search}%,category_name.ilike.%${filters.search}%`);
  }

  const { data, count } = await query;
  if (!data) return { transactions: [], totalCount: count || 0 };

  // Calculate running balances if specific currency + account type selected
  const transactions = await calculateRunningBalances(
    tenantId, data, filters.currency || 'all', filters.accountType || 'all'
  );

  return { transactions, totalCount: count || 0 };
}

async function calculateRunningBalances(
  tenantId: string,
  txList: any[],
  currency: string,
  accountType: string
): Promise<TransactionWithBalance[]> {
  if (txList.length === 0) return [];
  if (currency !== 'all' && accountType !== 'all') {
    const [txRes, accountRes] = await Promise.all([
      supabase.from('transactions')
        .select('id, type, amount, transaction_date, sequence_no')
        .eq('tenant_id', tenantId)
        .eq('currency', currency as 'MYR' | 'CNY' | 'USD')
        .eq('account_type', accountType as 'cash' | 'bank')
        .order('transaction_date', { ascending: true })
        .order('sequence_no', { ascending: true }),
      supabase.from('company_accounts')
        .select('balance')
        .eq('tenant_id', tenantId)
        .eq('currency', currency as 'MYR' | 'CNY' | 'USD')
        .eq('account_type', accountType as 'cash' | 'bank')
        .eq('include_in_stats', true)
        .maybeSingle(),
    ]);

    const allTxData = txRes.data;
    const initialBalance = Number(accountRes.data?.balance || 0);

    if (allTxData) {
      const balanceMap = new Map<string, { before: number; after: number }>();
      let running = initialBalance;
      allTxData.forEach(tx => {
        const before = running;
        running += tx.type === 'income' ? tx.amount : -tx.amount;
        balanceMap.set(tx.id, { before, after: running });
      });
      return txList.map(tx => {
        const b = balanceMap.get(tx.id);
        return { ...tx, balance_before: b?.before ?? 0, balance_after: b?.after ?? 0 };
      });
    }
  }
  return txList.map(tx => ({ ...tx, balance_before: undefined, balance_after: undefined }));
}

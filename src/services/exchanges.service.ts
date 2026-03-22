/**
 * Exchanges Service
 * 
 * 换汇交易数据访问层。
 */

import { supabase, handleSupabaseError, requireTenantId, DateRangeFilter } from './base';

// ===== Types =====

export interface ExchangeTransaction {
  id: string;
  transaction_date: string;
  out_currency: string;
  out_amount: number;
  out_amount_myr: number;
  out_account_type: string;
  in_currency: string;
  in_amount: number;
  in_amount_myr: number;
  in_account_type: string;
  exchange_rate: number;
  profit_loss: number;
  remark: string | null;
  sequence_no: number;
  created_by: string | null;
  tenant_id: string | null;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  rate_date: string;
  source: string | null;
  created_by: string | null;
  tenant_id: string | null;
  created_at: string;
}

export interface ExchangeFilters {
  dateRange?: DateRangeFilter;
  currency?: string;
}

// ===== Query Functions =====

export async function fetchExchangeTransactions(
  tenantId: string,
  filters?: ExchangeFilters
): Promise<ExchangeTransaction[]> {
  requireTenantId(tenantId);
  
  let query = supabase
    .from('exchange_transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('transaction_date', { ascending: false })
    .order('sequence_no', { ascending: false });
  
  if (filters?.currency && filters.currency !== 'all') {
    query = query.or(`out_currency.eq.${filters.currency},in_currency.eq.${filters.currency}`);
  }
  if (filters?.dateRange?.from) {
    query = query.gte('transaction_date', filters.dateRange.from);
  }
  if (filters?.dateRange?.to) {
    query = query.lte('transaction_date', filters.dateRange.to);
  }
  
  const { data, error } = await query;
  if (error) handleSupabaseError(error);
  return (data || []) as ExchangeTransaction[];
}

/**
 * 获取汇率列表（带租户隔离）
 */
export async function fetchExchangeRates(tenantId: string): Promise<ExchangeRate[]> {
  requireTenantId(tenantId);
  
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('rate_date', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (error) handleSupabaseError(error);
  return (data || []) as ExchangeRate[];
}

/**
 * @deprecated 使用 fetchExchangeRates(tenantId)，避免跨租户读取汇率
 */
export async function fetchAllExchangeRates(): Promise<ExchangeRate[]> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('rate_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error);
  return (data || []) as ExchangeRate[];
}

/**
 * 删除汇率记录
 */
export async function deleteExchangeRate(id: string): Promise<void> {
  const { error } = await supabase
    .from('exchange_rates')
    .delete()
    .eq('id', id);
  
  if (error) handleSupabaseError(error);
}

/**
 * 调用自动获取汇率：先尝试 Edge Function，失败则客户端直接采集
 */
export async function invokeAutoFetchRates(tenantId: string | undefined, manual: boolean): Promise<{ success: boolean; message?: string; source?: string; error?: string }> {
  // 1) 先尝试 Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('fetch-exchange-rates', {
      body: { manual, tenant_id: tenantId },
    });
    if (!error && data?.success) return data;
  } catch {
    // Edge Function 不可用，降级到客户端获取
  }

  // 2) 客户端直接从免费 API 获取汇率
  return clientSideFetchRates(tenantId);
}

type CurrencyRates = { USD: number; CNY: number; MYR: number };

async function fetchFromOpenErApi(): Promise<CurrencyRates> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD');
  if (!res.ok) throw new Error(`open.er-api HTTP ${res.status}`);
  const data = await res.json();
  if (data?.result !== 'success' || !data?.rates?.CNY || !data?.rates?.MYR)
    throw new Error('open.er-api payload invalid');
  return { USD: 1, CNY: Number(data.rates.CNY), MYR: Number(data.rates.MYR) };
}

async function fetchFromFrankfurter(): Promise<CurrencyRates> {
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=CNY,MYR');
  if (!res.ok) throw new Error(`frankfurter HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.rates?.CNY || !data?.rates?.MYR) throw new Error('frankfurter payload invalid');
  return { USD: 1, CNY: Number(data.rates.CNY), MYR: Number(data.rates.MYR) };
}

async function fetchFromCurrencyApi(): Promise<CurrencyRates> {
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'
  );
  if (!res.ok) throw new Error(`currency-api HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.usd?.cny || !data?.usd?.myr) throw new Error('currency-api payload invalid');
  return { USD: 1, CNY: Number(data.usd.cny), MYR: Number(data.usd.myr) };
}

async function clientSideFetchRates(
  tenantId: string | undefined
): Promise<{ success: boolean; message?: string; source?: string; error?: string }> {
  const apis = [fetchFromOpenErApi, fetchFromFrankfurter, fetchFromCurrencyApi];
  const apiNames = ['open.er-api.com', 'frankfurter.app', 'currency-api'];

  let rates: CurrencyRates | null = null;
  let sourceName = '';

  for (let i = 0; i < apis.length; i++) {
    try {
      rates = await apis[i]();
      sourceName = apiNames[i];
      break;
    } catch (e) {
      console.warn(`Client-side API ${apiNames[i]} failed:`, e);
    }
  }

  if (!rates) {
    return { success: false, error: '无法从任何来源获取汇率，请检查网络后重试' };
  }

  const pairs: Array<{ from: string; to: string }> = [
    { from: 'CNY', to: 'MYR' }, { from: 'USD', to: 'MYR' }, { from: 'CNY', to: 'USD' },
    { from: 'USD', to: 'CNY' }, { from: 'MYR', to: 'CNY' }, { from: 'MYR', to: 'USD' },
  ];

  const today = new Date().toISOString().split('T')[0];
  let successCount = 0;

  for (const pair of pairs) {
    const fromRate = pair.from === 'USD' ? 1 : rates[pair.from as keyof CurrencyRates];
    const toRate = pair.to === 'USD' ? 1 : rates[pair.to as keyof CurrencyRates];
    const calculatedRate = Number((toRate / fromRate).toFixed(6));

    let existingQuery = supabase
      .from('exchange_rates')
      .select('id')
      .eq('from_currency', pair.from as any)
      .eq('to_currency', pair.to as any)
      .eq('rate_date', today);

    if (tenantId) existingQuery = existingQuery.eq('tenant_id', tenantId);

    const { data: existing } = await existingQuery.limit(1).maybeSingle();

    const payload: Record<string, any> = {
      from_currency: pair.from,
      to_currency: pair.to,
      rate: calculatedRate,
      rate_date: today,
      source: 'auto',
      ...(tenantId && { tenant_id: tenantId }),
    };

    let error;
    if (existing?.id) {
      ({ error } = await supabase.from('exchange_rates').update(payload).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('exchange_rates').insert(payload));
    }

    if (!error) successCount++;
  }

  return {
    success: successCount > 0,
    message: `成功更新 ${successCount} 个汇率`,
    source: sourceName,
  };
}

/**
 * 获取最新汇率映射表（from_to → rate），按租户隔离
 */
export async function fetchLatestRateMap(tenantId?: string | null): Promise<Record<string, number>> {
  let q = supabase
    .from('exchange_rates')
    .select('from_currency, to_currency, rate')
    .order('rate_date', { ascending: false });

  if (tenantId) {
    q = q.eq('tenant_id', tenantId);
  }

  const { data, error } = await q;
  if (error) handleSupabaseError(error);

  const rates: Record<string, number> = {};
  (data || []).forEach(r => {
    const key = `${r.from_currency}_${r.to_currency}`;
    if (!rates[key]) {
      rates[key] = r.rate;
    }
  });
  return rates;
}

/**
 * 获取特定货币对的最新汇率（按租户隔离）
 */
export async function fetchLatestPairRate(
  fromCurrency: string,
  toCurrency: string,
  tenantId?: string | null
): Promise<number | null> {
  let q = supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', fromCurrency as any)
    .eq('to_currency', toCurrency as any)
    .order('rate_date', { ascending: false })
    .limit(1);

  if (tenantId) {
    q = q.eq('tenant_id', tenantId);
  }

  const { data, error } = await q.maybeSingle();
  if (error) handleSupabaseError(error);
  return data?.rate ?? null;
}

/**
 * 创建换汇交易
 */
export async function createExchangeTransaction(
  input: Omit<ExchangeTransaction, 'id' | 'created_at' | 'sequence_no'>
): Promise<ExchangeTransaction> {
  requireTenantId(input.tenant_id);
  
  const { data, error } = await supabase
    .from('exchange_transactions')
    .insert(input as any)
    .select()
    .single();
  
  if (error) handleSupabaseError(error);
  return data as unknown as ExchangeTransaction;
}

/**
 * 更新换汇交易
 */
export async function updateExchangeTransaction(
  id: string,
  input: Partial<ExchangeTransaction>
): Promise<void> {
  const { error } = await supabase
    .from('exchange_transactions')
    .update(input as any)
    .eq('id', id);
  
  if (error) handleSupabaseError(error);
}

/**
 * 删除换汇交易
 */
export async function deleteExchangeTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('exchange_transactions')
    .delete()
    .eq('id', id);
  
  if (error) handleSupabaseError(error);
}

/**
 * 获取换汇交易详情
 */
export async function fetchExchangeTransactionById(id: string): Promise<ExchangeTransaction> {
  const { data, error } = await supabase
    .from('exchange_transactions')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) handleSupabaseError(error);
  return data as unknown as ExchangeTransaction;
}

/**
 * 更新公司账户余额（原子操作）
 */
export async function adjustAccountBalance(
  accountType: string,
  currency: string,
  delta: number
): Promise<void> {
  const { data: account } = await supabase
    .from('company_accounts')
    .select('id, balance')
    .eq('account_type', accountType as any)
    .eq('currency', currency as any)
    .maybeSingle();
  
  if (account) {
    const { error } = await supabase
      .from('company_accounts')
      .update({ balance: account.balance + delta })
      .eq('id', account.id);
    if (error) handleSupabaseError(error);
  }
}

/**
 * 删除换汇交易并回滚账户余额
 */
export async function deleteExchangeTransactionWithBalances(id: string): Promise<void> {
  const exchange = await fetchExchangeTransactionById(id);
  
  // 回滚支出账户（加回去）
  await adjustAccountBalance(exchange.out_account_type, exchange.out_currency, exchange.out_amount);
  // 回滚收入账户（减掉）
  await adjustAccountBalance(exchange.in_account_type, exchange.in_currency, -exchange.in_amount);
  
  // 删除关联的 transactions 记录
  await supabase
    .from('transactions')
    .delete()
    .eq('ledger_type', 'exchange')
    .eq('transaction_date', exchange.transaction_date)
    .eq('created_by', exchange.created_by!);
  
  // 删除换汇记录
  await deleteExchangeTransaction(id);
}

/**
 * 创建换汇交易并更新账户余额
 */
export async function createExchangeTransactionWithBalances(
  input: Omit<ExchangeTransaction, 'id' | 'created_at' | 'sequence_no'>
): Promise<ExchangeTransaction> {
  const result = await createExchangeTransaction(input);
  
  // 支出账户减少
  await adjustAccountBalance(input.out_account_type, input.out_currency, -input.out_amount);
  // 收入账户增加
  await adjustAccountBalance(input.in_account_type, input.in_currency, input.in_amount);
  
  return result;
}

/**
 * 更新换汇交易并调整账户余额（先回滚旧的，再应用新的）
 */
export async function updateExchangeTransactionWithBalances(
  id: string,
  oldExchange: ExchangeTransaction,
  newPayload: Omit<ExchangeTransaction, 'id' | 'created_at' | 'sequence_no'>
): Promise<void> {
  // 回滚旧的余额影响
  await adjustAccountBalance(oldExchange.out_account_type, oldExchange.out_currency, oldExchange.out_amount);
  await adjustAccountBalance(oldExchange.in_account_type, oldExchange.in_currency, -oldExchange.in_amount);
  
  // 更新换汇记录
  await updateExchangeTransaction(id, newPayload as any);
  
  // 应用新的余额影响
  await adjustAccountBalance(newPayload.out_account_type, newPayload.out_currency, -newPayload.out_amount);
  await adjustAccountBalance(newPayload.in_account_type, newPayload.in_currency, newPayload.in_amount);
}

/**
 * 获取用户显示名映射
 */
export async function fetchCreatorNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name, username')
    .in('user_id', userIds);
  
  return new Map(
    profiles?.map(p => [p.user_id, p.display_name || p.username || '']) || []
  );
}

// ══════════════════════════════════════
// Exchange Rate CRUD
// ══════════════════════════════════════

export interface ExchangeRateCreateInput {
  from_currency: string;
  to_currency: string;
  rate: number;
  rate_date: string;
  source?: string;
  created_by: string;
  tenant_id?: string;
}

export async function upsertExchangeRate(payload: ExchangeRateCreateInput, editId?: string): Promise<void> {
  if (editId) {
    const { error } = await supabase.from('exchange_rates').update(payload as any).eq('id', editId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('exchange_rates').insert(payload as any);
    if (error) handleSupabaseError(error);
  }
}

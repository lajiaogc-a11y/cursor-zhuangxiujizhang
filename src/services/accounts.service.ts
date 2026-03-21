/**
 * Accounts Service
 * 
 * 公司账户数据访问层。
 */

import { supabase, handleSupabaseError, requireTenantId } from './base';

// ===== Types =====

export interface CompanyAccount {
  id: string;
  account_type: string;
  currency: string;
  balance: number;
  include_in_stats: boolean | null;
  tenant_id: string | null;
  updated_at: string;
}

export interface AccountBalanceMap {
  [currency: string]: {
    [accountType: string]: number;
  };
}

// ===== Query Functions =====

/**
 * 获取所有公司账户
 */
export async function fetchAccounts(tenantId: string): Promise<CompanyAccount[]> {
  requireTenantId(tenantId);
  
  const { data, error } = await supabase
    .from('company_accounts')
    .select('*')
    .eq('tenant_id', tenantId);
  
  if (error) handleSupabaseError(error);
  return (data || []) as CompanyAccount[];
}

/**
 * 获取账户初始余额映射
 */
export async function fetchAccountBalanceMap(tenantId: string): Promise<AccountBalanceMap> {
  const accounts = await fetchAccounts(tenantId);
  const balanceMap: AccountBalanceMap = {};
  
  accounts.forEach(acc => {
    if (!balanceMap[acc.currency]) balanceMap[acc.currency] = {};
    balanceMap[acc.currency][acc.account_type] = Number(acc.balance || 0);
  });
  
  return balanceMap;
}

/**
 * 更新账户余额
 */
export async function updateAccountBalance(
  id: string,
  balance: number
): Promise<void> {
  const { error } = await supabase
    .from('company_accounts')
    .update({ balance, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) handleSupabaseError(error);
}

/**
 * Alerts Service
 * 
 * 预警系统的数据访问与业务逻辑层。
 * 包含预警规则CRUD、预警生成算法、预警状态管理。
 */

import { supabase, handleSupabaseError, requireTenantId } from './base';
import type { Database } from '@/integrations/supabase/types';
import { differenceInDays } from 'date-fns';

type AlertRule = Database['public']['Tables']['alert_rules']['Row'];
type AlertType = Database['public']['Enums']['alert_type'];
type AlertLevel = Database['public']['Enums']['alert_level'];

export type ProjectAlert = Database['public']['Tables']['project_alerts']['Row'] & {
  projects?: { project_name: string; project_code: string } | null;
};

interface NewAlert {
  alert_type: AlertType;
  alert_level: AlertLevel;
  alert_message: string;
  project_id?: string | null;
}

interface AlertMessages {
  profitWarningMsg: string;
  warrantyExpiringMsg: string;
  deliveryUpcomingMsg: string;
  finalPaymentDueMsg: string;
  paymentOverdueMsg: string;
  balanceWarningMsg: string;
  totalBalanceWarningMsg: string;
  cash: string;
  bank: string;
}

// ─── Fetch ────────────────────────────────────────────

export async function fetchAlertsAndRules(tenantId: string) {
  requireTenantId(tenantId);
  const [alertsRes, rulesRes] = await Promise.all([
    supabase
      .from('project_alerts')
      .select('*, projects(project_name, project_code)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
    supabase.from('alert_rules').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true }),
  ]);
  return {
    alerts: (alertsRes.data || []) as ProjectAlert[],
    rules: (rulesRes.data || []) as AlertRule[],
  };
}

// ─── Alert Resolution ─────────────────────────────────

export async function resolveAlert(alertId: string) {
  const { error } = await supabase
    .from('project_alerts')
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', alertId);
  if (error) handleSupabaseError(error);
}

// ─── Rule CRUD ────────────────────────────────────────

export async function saveRule(payload: any, editingRuleId?: string) {
  if (editingRuleId) {
    const { error } = await supabase.from('alert_rules').update(payload).eq('id', editingRuleId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('alert_rules').insert(payload);
    if (error) handleSupabaseError(error);
  }
}

export async function toggleRule(ruleId: string, currentActive: boolean) {
  const { error } = await supabase
    .from('alert_rules')
    .update({ is_active: !currentActive })
    .eq('id', ruleId);
  if (error) handleSupabaseError(error);
}

export async function deleteRule(ruleId: string) {
  const { error } = await supabase.from('alert_rules').delete().eq('id', ruleId);
  if (error) handleSupabaseError(error);
}

// ─── Alert Generation ─────────────────────────────────

export async function generateAlerts(tenantId: string, messages: AlertMessages): Promise<number> {
  requireTenantId(tenantId);

  // Fetch active rules
  const { data: activeRules } = await supabase
    .from('alert_rules').select('*')
    .eq('tenant_id', tenantId).eq('is_active', true);
  if (!activeRules || activeRules.length === 0) return -1; // signal: no active rules

  // Fetch projects, accounts, transactions in parallel
  const [projectsRes, accountsRes, transactionsRes] = await Promise.all([
    supabase.from('projects').select('*').eq('tenant_id', tenantId).neq('status', 'completed'),
    supabase.from('company_accounts').select('*').eq('tenant_id', tenantId).eq('include_in_stats', true),
    supabase.from('transactions').select('currency, account_type, type, amount_myr, amount').eq('tenant_id', tenantId),
  ]);

  const projects = projectsRes.data || [];
  const accounts = accountsRes.data || [];
  const txData = transactionsRes.data || [];

  // Calculate real-time balances
  const calculatedBalances: Record<string, number> = {};
  accounts.forEach(acc => {
    calculatedBalances[`${acc.currency}_${acc.account_type}`] = acc.balance || 0;
  });
  txData.forEach(tx => {
    const key = `${tx.currency}_${tx.account_type}`;
    if (!(key in calculatedBalances)) calculatedBalances[key] = 0;
    calculatedBalances[key] += tx.type === 'income' ? (tx.amount || 0) : -(tx.amount || 0);
  });

  const today = new Date();
  const newAlerts: NewAlert[] = [];

  for (const rule of activeRules) {
    // Profit warning
    if (rule.rule_type === 'profit_warning' && rule.threshold_value != null) {
      const { data: projTx } = await supabase
        .from('transactions')
        .select('project_id, type, amount_myr')
        .eq('tenant_id', tenantId).eq('ledger_type', 'project')
        .not('project_id', 'is', null);

      const stats: Record<string, { income: number; expense: number }> = {};
      projTx?.forEach(tx => {
        if (!tx.project_id) return;
        if (!stats[tx.project_id]) stats[tx.project_id] = { income: 0, expense: 0 };
        if (tx.type === 'income') stats[tx.project_id].income += tx.amount_myr || 0;
        else stats[tx.project_id].expense += tx.amount_myr || 0;
      });

      for (const p of projects) {
        const totalReceivable = (p.contract_amount_myr || 0) + (p.total_addition_myr || 0);
        const s = stats[p.id] || { income: 0, expense: 0 };
        const profitMargin = totalReceivable > 0 ? ((s.income - s.expense) / totalReceivable * 100) : 0;
        if (profitMargin < rule.threshold_value) {
          newAlerts.push({
            alert_type: 'profit_warning',
            alert_level: profitMargin < 0 ? 'danger' : 'warning',
            alert_message: messages.profitWarningMsg
              .replace('{code}', p.project_code).replace('{rate}', profitMargin.toFixed(1))
              .replace('{threshold}', String(rule.threshold_value)),
            project_id: p.id,
          });
        }
      }
    }

    // Date-based alerts
    const dateAlerts: Array<{ type: AlertType; dateField: string; msgTemplate: string }> = [
      { type: 'warranty_expiring' as AlertType, dateField: 'warranty_end_date', msgTemplate: 'warrantyExpiringMsg' },
      { type: 'delivery_upcoming' as AlertType, dateField: 'delivery_date', msgTemplate: 'deliveryUpcomingMsg' },
      { type: 'final_payment_due' as AlertType, dateField: 'final_payment_date', msgTemplate: 'finalPaymentDueMsg' },
    ];

    for (const da of dateAlerts) {
      if (rule.rule_type === da.type && rule.alert_days_before != null) {
        for (const p of projects) {
          const dateVal = (p as any)[da.dateField];
          if (dateVal) {
            const d = new Date(dateVal);
            const daysUntil = differenceInDays(d, today);
            if (daysUntil >= 0 && daysUntil <= rule.alert_days_before) {
              newAlerts.push({
                alert_type: da.type,
                alert_level: daysUntil <= 3 ? 'danger' : 'warning',
                alert_message: (messages as any)[da.msgTemplate]
                  .replace('{code}', p.project_code).replace('{days}', String(daysUntil))
                  .replace('{date}', dateVal),
                project_id: p.id,
              });
            }
          }
        }
      }
    }

    // Payment overdue
    if (rule.rule_type === 'payment_overdue' && rule.threshold_value != null) {
      for (const p of projects) {
        if (p.final_payment_date) {
          const daysOverdue = differenceInDays(today, new Date(p.final_payment_date));
          if (daysOverdue > 0 && daysOverdue >= rule.threshold_value) {
            newAlerts.push({
              alert_type: 'payment_overdue',
              alert_level: 'danger',
              alert_message: messages.paymentOverdueMsg
                .replace('{code}', p.project_code).replace('{days}', String(daysOverdue)),
              project_id: p.id,
            });
          }
        }
      }
    }

    // Low balance
    if (rule.rule_type === 'low_balance' && rule.threshold_value != null) {
      const currencies = rule.account_currency && rule.account_currency !== 'all'
        ? [rule.account_currency] : ['MYR', 'CNY', 'USD'];
      const checkSpecific = rule.account_type && rule.account_type !== 'all';

      for (const currency of currencies) {
        if (checkSpecific) {
          const key = `${currency}_${rule.account_type}`;
          const balance = calculatedBalances[key] || 0;
          if (balance < rule.threshold_value) {
            const accName = rule.account_type === 'cash' ? messages.cash : messages.bank;
            newAlerts.push({
              alert_type: 'low_balance',
              alert_level: balance < 0 ? 'danger' : 'warning',
              alert_message: messages.balanceWarningMsg
                .replace('{currency}', currency).replace('{account}', accName)
                .replace('{balance}', balance.toLocaleString())
                .replace('{threshold}', rule.threshold_value.toLocaleString()),
              project_id: null,
            });
          }
        } else {
          const cashKey = `${currency}_cash`;
          const bankKey = `${currency}_bank`;
          const total = (calculatedBalances[cashKey] || 0) + (calculatedBalances[bankKey] || 0);
          const hasRecord = calculatedBalances[cashKey] !== undefined || calculatedBalances[bankKey] !== undefined;
          const isSpecific = rule.account_currency && rule.account_currency !== 'all';
          if ((isSpecific || hasRecord) && total < rule.threshold_value) {
            newAlerts.push({
              alert_type: 'low_balance',
              alert_level: total < 0 ? 'danger' : 'warning',
              alert_message: messages.totalBalanceWarningMsg
                .replace('{currency}', currency).replace('{balance}', total.toLocaleString())
                .replace('{threshold}', rule.threshold_value.toLocaleString())
                .replace('{cash}', (calculatedBalances[cashKey] || 0).toLocaleString())
                .replace('{bank}', (calculatedBalances[bankKey] || 0).toLocaleString()),
              project_id: null,
            });
          }
        }
      }
    }
  }

  // Clear old unresolved alerts & insert new ones
  await supabase.from('project_alerts').delete().eq('is_resolved', false);
  if (newAlerts.length > 0) {
    const { error } = await supabase.from('project_alerts').insert(newAlerts);
    if (error) handleSupabaseError(error);
  }

  return newAlerts.length;
}

// ─── Count (for sidebar badge) ────────────────────────
export async function fetchUnresolvedAlertCount(tenantId: string): Promise<number> {
  requireTenantId(tenantId);
  const { count, error } = await supabase
    .from('project_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_resolved', false);
  if (error || count === null) return 0;
  return count;
}

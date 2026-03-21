/**
 * Centralized Permission Keys
 *
 * All permission strings used across routes, sidebar, and access checks
 * are defined here. Use these constants instead of raw strings to catch
 * typos at compile time.
 *
 * Usage:
 *   import { P } from '@/constants/permissions';
 *   hasPermission(P.NAV_DASHBOARD)
 */

export const P = {
  // ── Navigation (Finance module pages) ──
  NAV_DASHBOARD: 'nav.dashboard',
  NAV_MEMOS: 'nav.memos',
  NAV_PROJECTS: 'nav.projects',
  NAV_TRANSACTIONS: 'nav.transactions',
  NAV_EXCHANGE: 'nav.exchange',
  NAV_PAYROLL: 'nav.payroll',
  NAV_PAYABLES: 'nav.payables',
  NAV_BANK_RECONCILIATION: 'nav.bank_reconciliation',
  NAV_CONTACTS: 'nav.contacts',
  NAV_INVOICES: 'nav.invoices',
  NAV_TAX_MANAGEMENT: 'nav.tax_management',
  NAV_APPROVALS: 'nav.approvals',
  NAV_FIXED_ASSETS: 'nav.fixed_assets',
  NAV_ALERTS: 'nav.alerts',
  NAV_REPORTS: 'nav.reports',
  NAV_MONTHLY_REPORTS: 'nav.monthly_reports',
  NAV_BALANCE_LEDGER: 'nav.balance_ledger',
  NAV_SETTINGS: 'nav.settings',

  // ── Subsystem-level access ──
  SYSTEM_QUOTATION: 'system.quotation',
  SYSTEM_COST: 'system.cost',
  SYSTEM_PURCHASING: 'system.purchasing',
  SYSTEM_FINANCE: 'system.finance',
  SYSTEM_CRM: 'system.crm',
  SYSTEM_WORKFORCE: 'system.workforce',

  // ── CRM navigation ──
  NAV_CRM_DASHBOARD: 'nav.crm_dashboard',
  NAV_CRM_CUSTOMERS: 'nav.crm_customers',
  NAV_CRM_CONTRACTS: 'nav.crm_contracts',
  NAV_CRM_TEMPLATES: 'nav.crm_templates',
  NAV_CRM_AMENDMENTS: 'nav.crm_amendments',
  NAV_CRM_REPORTS: 'nav.crm_reports',

  // ── Workforce navigation ──
  NAV_WF_SITES: 'nav.wf_sites',
  NAV_WF_WORKERS: 'nav.wf_workers',
  NAV_WF_SHIFTS: 'nav.wf_shifts',
  NAV_WF_ATTENDANCE: 'nav.wf_attendance',
  NAV_WF_LEAVES: 'nav.wf_leaves',
  NAV_WF_PAYROLL: 'nav.wf_payroll',
  NAV_WF_REPORTS: 'nav.wf_reports',
} as const;

/** Union type of all valid permission keys */
export type PermissionKey = (typeof P)[keyof typeof P];

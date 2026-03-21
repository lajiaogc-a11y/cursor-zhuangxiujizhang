-- Remove unused views that cause CASCADE dependency issues during publish
DROP VIEW IF EXISTS public.financial_summary CASCADE;
DROP VIEW IF EXISTS public.account_balances_summary CASCADE;
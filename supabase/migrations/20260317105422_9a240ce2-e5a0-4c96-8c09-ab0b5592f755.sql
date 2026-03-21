
-- Fix SECURITY DEFINER views by setting them to SECURITY INVOKER
-- This ensures RLS policies are respected for the querying user
ALTER VIEW public.account_balances_summary SET (security_invoker = on);
ALTER VIEW public.financial_summary SET (security_invoker = on);

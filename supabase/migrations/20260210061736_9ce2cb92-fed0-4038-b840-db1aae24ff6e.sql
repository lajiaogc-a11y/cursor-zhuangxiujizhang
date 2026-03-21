
-- Create has_nav_permission function
CREATE OR REPLACE FUNCTION public.has_nav_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role IN ('admin', 'accountant')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = _user_id 
        AND permission_key = _permission_key 
        AND granted = true
    )
$$;

-- transactions: drop old policy and create permission-based one
DROP POLICY IF EXISTS "Admin and accountant can view transactions" ON transactions;
CREATE POLICY "Users with permission can view transactions"
  ON transactions FOR SELECT TO authenticated
  USING (
    has_nav_permission(auth.uid(), 'nav.transactions')
    OR has_nav_permission(auth.uid(), 'nav.dashboard')
  );

-- company_accounts: drop old policy and create permission-based one
DROP POLICY IF EXISTS "Admin and accountant can view company accounts" ON company_accounts;
CREATE POLICY "Users with permission can view company accounts"
  ON company_accounts FOR SELECT TO authenticated
  USING (
    has_nav_permission(auth.uid(), 'nav.transactions')
    OR has_nav_permission(auth.uid(), 'nav.dashboard')
    OR has_nav_permission(auth.uid(), 'nav.balance_ledger')
  );

-- exchange_transactions: drop old policy and create permission-based one
DROP POLICY IF EXISTS "Admin and accountant can view exchange transactions" ON exchange_transactions;
CREATE POLICY "Users with permission can view exchange transactions"
  ON exchange_transactions FOR SELECT TO authenticated
  USING (
    has_nav_permission(auth.uid(), 'nav.exchange')
    OR has_nav_permission(auth.uid(), 'nav.dashboard')
  );


-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Tenant admin/accountant can manage transactions" ON public.transactions;

-- Recreate: allow admin/accountant to manage transactions for ANY of their tenants
CREATE POLICY "Tenant admin/accountant can manage transactions"
ON public.transactions
FOR ALL
TO authenticated
USING (
  tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
  AND public.is_admin_or_accountant(auth.uid())
)
WITH CHECK (
  tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
  AND public.is_admin_or_accountant(auth.uid())
);

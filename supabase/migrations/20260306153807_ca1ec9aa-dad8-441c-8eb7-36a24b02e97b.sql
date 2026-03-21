-- Clean up q_purchase_receivings: remove all old policies and keep only proper ones
DROP POLICY IF EXISTS "Authenticated users can manage q_purchase_receivings" ON public.q_purchase_receivings;
DROP POLICY IF EXISTS "Authenticated can view q_purchase_receivings" ON public.q_purchase_receivings;
DROP POLICY IF EXISTS "Tenant members can manage purchase receivings" ON public.q_purchase_receivings;
DROP POLICY IF EXISTS "Tenant members can view q_purchase_receivings" ON public.q_purchase_receivings;
-- Keep "Admin or accountant can manage q_purchase_receivings" as it's already correct

-- Add tenant-scoped SELECT for non-admin users
CREATE POLICY "Tenant members can view q_purchase_receivings"
  ON public.q_purchase_receivings FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
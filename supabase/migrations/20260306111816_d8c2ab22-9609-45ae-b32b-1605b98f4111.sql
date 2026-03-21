
-- 1. Helper: get all tenant_ids for a user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members
  WHERE user_id = _user_id AND is_active = true;
$$;

-- 2. Helper: check if user is owner/admin of a specific tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  );
$$;

-- 3. Drop existing recursive policies on tenant_members
DROP POLICY IF EXISTS "Members can view own tenant members" ON public.tenant_members;
DROP POLICY IF EXISTS "Admins can manage tenant members" ON public.tenant_members;

-- 4. Drop existing policies on tenants that may cause chained recursion
DROP POLICY IF EXISTS "Members can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Super admins can manage tenants" ON public.tenants;

-- 5. New policies for tenant_members (using helper functions)
CREATE POLICY "Members can view own tenant members"
ON public.tenant_members FOR SELECT TO authenticated
USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "Tenant admins or super admins can manage members"
ON public.tenant_members FOR ALL TO authenticated
USING (
  public.is_tenant_admin(auth.uid(), tenant_id)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_tenant_admin(auth.uid(), tenant_id)
  OR public.is_super_admin(auth.uid())
);

-- 6. New policies for tenants
CREATE POLICY "Members can view their tenants"
ON public.tenants FOR SELECT TO authenticated
USING (id IN (SELECT public.get_user_tenant_ids(auth.uid())) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage tenants"
ON public.tenants FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

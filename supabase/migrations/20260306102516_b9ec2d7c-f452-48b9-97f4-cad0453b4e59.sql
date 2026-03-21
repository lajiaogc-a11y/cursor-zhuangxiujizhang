
-- ============================================
-- Phase 1: Multi-Tenant Infrastructure
-- ============================================

-- 1. Tenant plan enum
CREATE TYPE public.tenant_plan AS ENUM ('free', 'basic', 'professional', 'enterprise');

-- 2. Tenant status enum
CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'expired', 'cancelled');

-- 3. Tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  plan tenant_plan NOT NULL DEFAULT 'free',
  status tenant_status NOT NULL DEFAULT 'active',
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  logo_url text,
  contact_email text,
  contact_phone text,
  max_members integer NOT NULL DEFAULT 5,
  expires_at timestamptz,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Tenant members table (user-tenant mapping)
CREATE TYPE public.tenant_member_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role tenant_member_role NOT NULL DEFAULT 'member',
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

-- 5. Tenant subscriptions table
CREATE TYPE public.subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');

CREATE TABLE public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan tenant_plan NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  price_amount numeric NOT NULL DEFAULT 0,
  price_currency text NOT NULL DEFAULT 'MYR',
  stripe_subscription_id text,
  stripe_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Indexes
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id);
CREATE INDEX idx_tenant_subscriptions_tenant ON public.tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_status ON public.tenants(status);

-- 7. Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- 8. get_user_tenant_id() - core isolation function
-- Returns the active tenant_id for the current user
-- For now, returns the first active tenant; later we can add session-based selection
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tm.tenant_id
  FROM public.tenant_members tm
  JOIN public.tenants t ON t.id = tm.tenant_id
  WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND t.status = 'active'
  ORDER BY tm.joined_at ASC
  LIMIT 1;
$$;

-- 9. is_super_admin() - check if user is platform-level super admin
-- Super admin = tenant owner of the very first tenant created
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    WHERE tm.user_id = _user_id
      AND tm.role = 'owner'
      AND t.id = (SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1)
  );
$$;

-- 10. RLS Policies for tenants
CREATE POLICY "Members can view their tenants"
  ON public.tenants FOR SELECT TO authenticated
  USING (id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Super admins can manage all tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 11. RLS Policies for tenant_members
CREATE POLICY "Users can view members of their tenants"
  ON public.tenant_members FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members AS tm2 WHERE tm2.user_id = auth.uid() AND tm2.is_active = true));

CREATE POLICY "Tenant admins can manage members"
  ON public.tenant_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members AS tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

-- 12. RLS Policies for tenant_subscriptions
CREATE POLICY "Tenant owners can view subscriptions"
  ON public.tenant_subscriptions FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
  ));

CREATE POLICY "Super admins can manage subscriptions"
  ON public.tenant_subscriptions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 13. Create default tenant and assign current users
-- Insert default tenant
INSERT INTO public.tenants (id, name, slug, plan, status, max_members)
VALUES ('00000000-0000-0000-0000-000000000001', '默认公司', 'default', 'enterprise', 'active', 100);

-- Assign all existing users as members of default tenant
-- The first admin user becomes owner, others become members
INSERT INTO public.tenant_members (tenant_id, user_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  ur.user_id,
  CASE WHEN ur.role = 'admin' THEN 'owner'::tenant_member_role ELSE 'member'::tenant_member_role END
FROM public.user_roles ur
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- 14. Updated_at trigger for tenants
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

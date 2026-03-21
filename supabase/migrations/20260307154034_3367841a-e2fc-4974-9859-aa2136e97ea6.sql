-- 1. 创建 tenants 表（如果不存在）— 必须在 schema diff 之前
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan tenant_plan NOT NULL DEFAULT 'free',
  status tenant_status NOT NULL DEFAULT 'active',
  owner_user_id uuid,
  logo_url text,
  contact_email text,
  contact_phone text,
  max_members integer NOT NULL DEFAULT 5,
  expires_at timestamptz,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. 创建 tenant_members 表（如果不存在）
CREATE TABLE IF NOT EXISTS public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role tenant_member_role NOT NULL DEFAULT 'member',
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- 3. 插入默认租户
INSERT INTO public.tenants (id, name, slug, plan, status, max_members)
VALUES ('00000000-0000-0000-0000-000000000001', '默认公司', 'default', 'enterprise', 'active', 100)
ON CONFLICT (id) DO NOTHING;

-- 4. 启用 RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenants' AND policyname = 'Members can view their tenants') THEN
    CREATE POLICY "Members can view their tenants"
      ON public.tenants FOR SELECT TO authenticated
      USING (id IN (SELECT public.get_user_tenant_ids(auth.uid())));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenants' AND policyname = 'Super admins can manage tenants') THEN
    CREATE POLICY "Super admins can manage tenants"
      ON public.tenants FOR ALL TO authenticated
      USING (public.is_super_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_members' AND policyname = 'Members can view own tenant members') THEN
    CREATE POLICY "Members can view own tenant members"
      ON public.tenant_members FOR SELECT TO authenticated
      USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_members' AND policyname = 'Tenant admins or super admins can manage members') THEN
    CREATE POLICY "Tenant admins or super admins can manage members"
      ON public.tenant_members FOR ALL TO authenticated
      USING (public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));
  END IF;
END $$;
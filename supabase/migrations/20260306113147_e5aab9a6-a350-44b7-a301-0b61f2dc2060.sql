
-- A. Drop residual old recursive policies
DROP POLICY IF EXISTS "Tenant admins can manage members" ON public.tenant_members;
DROP POLICY IF EXISTS "Users can view members of their tenants" ON public.tenant_members;
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;

-- B. Add tenant_id column to invitation_codes
ALTER TABLE public.invitation_codes 
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- C. Default existing codes to default tenant
UPDATE public.invitation_codes 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- D. Make tenant_id NOT NULL going forward
ALTER TABLE public.invitation_codes 
  ALTER COLUMN tenant_id SET NOT NULL;

-- E. Rewrite use_invitation_code to return tenant_id
CREATE OR REPLACE FUNCTION public.use_invitation_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row invitation_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM invitation_codes
    WHERE code = p_code AND is_active = true
    FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN RETURN NULL; END IF;
  IF v_row.used_count >= v_row.max_uses THEN RETURN NULL; END IF;
  UPDATE invitation_codes SET used_count = used_count + 1 WHERE id = v_row.id;
  RETURN v_row.tenant_id;
END;
$$;

-- F. Rewrite handle_new_user_complete to use metadata tenant_id
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
  assigned_role app_role;
  target_tenant_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, username, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Skip if roles already assigned
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Check if first user
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  ) INTO is_first_user;
  
  IF is_first_user THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'viewer';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Determine tenant: use metadata tenant_id from invitation code, fallback to default
  target_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
  IF target_tenant_id IS NULL THEN
    SELECT id INTO target_tenant_id FROM public.tenants ORDER BY created_at ASC LIMIT 1;
  END IF;
  
  IF target_tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (target_tenant_id, NEW.id, 
      CASE WHEN is_first_user THEN 'owner'::tenant_member_role ELSE 'member'::tenant_member_role END)
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- G. Data repair: add current super admin as owner of orphan tenants
INSERT INTO public.tenant_members (tenant_id, user_id, role)
SELECT t.id, 'e655ecd3-3cea-4be2-a237-8ecbadf0e437', 'owner'::tenant_member_role
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = t.id
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;

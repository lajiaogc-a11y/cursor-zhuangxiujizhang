
-- Fix: first user joining a new tenant should get 'admin' role, not 'viewer'
-- Check per-tenant whether any admin exists in user_roles for that tenant's members
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_first_user BOOLEAN;
  is_first_tenant_admin BOOLEAN;
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
  
  -- Determine tenant: use metadata tenant_id from invitation code, fallback to default
  target_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
  IF target_tenant_id IS NULL THEN
    SELECT id INTO target_tenant_id FROM public.tenants ORDER BY created_at ASC LIMIT 1;
  END IF;
  
  -- Check if first user globally (no admin exists at all)
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  ) INTO is_first_user;
  
  -- Check if this tenant has any member with admin role in user_roles
  IF NOT is_first_user AND target_tenant_id IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.tenant_members tm ON tm.user_id = ur.user_id
      WHERE tm.tenant_id = target_tenant_id
        AND tm.is_active = true
        AND ur.role = 'admin'
    ) INTO is_first_tenant_admin;
  ELSE
    is_first_tenant_admin := false;
  END IF;
  
  IF is_first_user OR is_first_tenant_admin THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'viewer';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Add to tenant
  IF target_tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (target_tenant_id, NEW.id, 
      CASE WHEN is_first_user OR is_first_tenant_admin THEN 'owner'::tenant_member_role ELSE 'member'::tenant_member_role END)
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

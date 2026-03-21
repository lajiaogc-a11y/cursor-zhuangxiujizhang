-- Fix: handle_new_user_complete should NOT fallback to default tenant
-- Users without a tenant_id in metadata should not be auto-assigned to any tenant
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Skip if roles already assigned (e.g. created via admin edge function)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Determine tenant: ONLY use metadata tenant_id (from invitation code or admin creation)
  -- Do NOT fallback to default tenant - users must have explicit tenant assignment
  target_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
  
  -- Check if first user globally (bootstrap scenario)
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  ) INTO is_first_user;
  
  IF is_first_user THEN
    assigned_role := 'admin';
    -- First user gets assigned to default tenant as owner (bootstrap)
    IF target_tenant_id IS NULL THEN
      SELECT id INTO target_tenant_id FROM public.tenants ORDER BY created_at ASC LIMIT 1;
    END IF;
  ELSE
    assigned_role := 'viewer';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Only add to tenant if we have a target
  IF target_tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (target_tenant_id, NEW.id, 
      CASE WHEN is_first_user THEN 'owner'::tenant_member_role ELSE 'member'::tenant_member_role END)
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
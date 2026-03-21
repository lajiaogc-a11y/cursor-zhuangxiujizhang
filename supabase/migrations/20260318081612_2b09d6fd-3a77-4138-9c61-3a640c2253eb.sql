-- Function to check tenant expiry (used in RLS and application code)
CREATE OR REPLACE FUNCTION public.is_tenant_expired(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = _tenant_id
      AND expires_at IS NOT NULL
      AND expires_at < now()
  );
$$;

-- Update get_user_tenant_ids to exclude expired tenants
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tm.tenant_id 
  FROM public.tenant_members tm
  JOIN public.tenants t ON t.id = tm.tenant_id
  WHERE tm.user_id = _user_id 
    AND tm.is_active = true
    AND t.status = 'active'
    AND (t.expires_at IS NULL OR t.expires_at >= now());
$$;
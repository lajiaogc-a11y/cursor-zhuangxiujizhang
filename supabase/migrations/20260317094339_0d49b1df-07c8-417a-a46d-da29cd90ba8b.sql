
-- Create validate_invitation_code function (read-only, does NOT consume)
CREATE OR REPLACE FUNCTION public.validate_invitation_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row invitation_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM invitation_codes
    WHERE code = p_code AND is_active = true;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN RETURN NULL; END IF;
  IF v_row.used_count >= v_row.max_uses THEN RETURN NULL; END IF;
  RETURN v_row.tenant_id;
END;
$$;

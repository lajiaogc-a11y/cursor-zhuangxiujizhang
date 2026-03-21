
-- Drop old function with boolean return type
DROP FUNCTION IF EXISTS public.use_invitation_code(text);

-- Recreate with uuid return type
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

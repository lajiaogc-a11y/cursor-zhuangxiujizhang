
CREATE TABLE public.invitation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  note text
);

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage invitation codes"
  ON public.invitation_codes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can check invitation codes"
  ON public.invitation_codes FOR SELECT TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.use_invitation_code(p_code text)
RETURNS boolean
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
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN RETURN false; END IF;
  IF v_row.used_count >= v_row.max_uses THEN RETURN false; END IF;
  UPDATE invitation_codes SET used_count = used_count + 1 WHERE id = v_row.id;
  RETURN true;
END;
$$;


-- System announcements table for platform-wide notifications
CREATE TABLE public.system_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  announcement_type text NOT NULL DEFAULT 'info', -- info, warning, maintenance, update
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage announcements
CREATE POLICY "Super admins can manage announcements"
  ON public.system_announcements
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- All authenticated users can read active announcements
CREATE POLICY "All users can read active announcements"
  ON public.system_announcements
  FOR SELECT
  TO authenticated
  USING (is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));

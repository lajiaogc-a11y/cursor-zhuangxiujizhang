
-- Login attempt tracking for brute force protection
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  email TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON public.login_attempts(ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email, attempted_at);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admin can view
CREATE POLICY "Admin can view login attempts" ON public.login_attempts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions can insert (service role)
CREATE POLICY "System can insert login attempts" ON public.login_attempts
  FOR INSERT WITH CHECK (true);

-- Admin can clean up
CREATE POLICY "Admin can delete login attempts" ON public.login_attempts
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to check if IP/email is locked out (5 failed attempts in 15 minutes)
CREATE OR REPLACE FUNCTION public.is_login_locked(check_ip TEXT, check_email TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT COUNT(*) as fail_count
      FROM public.login_attempts
      WHERE (ip_address = check_ip OR (check_email IS NOT NULL AND email = check_email))
        AND attempted_at > now() - interval '15 minutes'
        AND success = false
    ) sub
    WHERE sub.fail_count >= 5
  );
$$;

-- Auto-cleanup old login attempts (keep 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_login_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.login_attempts WHERE attempted_at < now() - interval '7 days';
$$;

-- Fix remaining "always true" INSERT policies

-- 1. login_attempts: service role bypasses RLS, this policy is a security risk
DROP POLICY IF EXISTS "System can insert login attempts" ON public.login_attempts;

-- 2. analytics_events: restrict to authenticated users with uid check
DROP POLICY IF EXISTS "Authenticated users can insert analytics events" ON public.analytics_events;
CREATE POLICY "Authenticated users can insert analytics events"
  ON public.analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 3. error_logs: acceptable for authenticated users but add uid binding
DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON public.error_logs;
CREATE POLICY "Authenticated users can insert error logs"
  ON public.error_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
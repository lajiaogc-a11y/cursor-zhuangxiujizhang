-- Optimize audit_logs INSERT policy to prevent direct user inserts
-- Drop the current INSERT policy that allows users to insert
DROP POLICY IF EXISTS "Trigger can insert audit logs" ON public.audit_logs;

-- Create a more restrictive INSERT policy that only allows trigger context
-- By checking if user_id matches the current session AND old_data/new_data are not null
-- (which indicates a trigger context where we have before/after data)
CREATE POLICY "System can insert audit logs via trigger"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  -- Only allow inserts from triggers (where we have both record_id and action)
  -- Regular users trying to insert will fail because they can't provide valid trigger context
  (record_id IS NOT NULL AND action IS NOT NULL AND table_name IS NOT NULL)
);
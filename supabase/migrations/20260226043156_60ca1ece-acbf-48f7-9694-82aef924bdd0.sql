
-- Archive tables for cold data storage
CREATE TABLE IF NOT EXISTS public.audit_logs_archive (
  LIKE public.audit_logs INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS public.analytics_events_archive (
  LIKE public.analytics_events INCLUDING ALL
);

-- Add archived_at timestamp
ALTER TABLE public.audit_logs_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.analytics_events_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Create index on archived_at for cleanup
CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_archived_at ON public.audit_logs_archive(archived_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_archive_archived_at ON public.analytics_events_archive(archived_at);

-- Create index on created_at for the source tables to speed up archival queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- RLS on archive tables: admin only
ALTER TABLE public.audit_logs_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view audit logs archive" ON public.audit_logs_archive
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete audit logs archive" ON public.audit_logs_archive
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can view analytics events archive" ON public.analytics_events_archive
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete analytics events archive" ON public.analytics_events_archive
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to archive old data
CREATE OR REPLACE FUNCTION public.archive_old_data(days_threshold INTEGER DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  audit_count INTEGER;
  analytics_count INTEGER;
BEGIN
  cutoff_date := now() - (days_threshold || ' days')::interval;
  
  -- Archive audit_logs
  WITH moved AS (
    DELETE FROM public.audit_logs
    WHERE created_at < cutoff_date
    RETURNING *
  )
  INSERT INTO public.audit_logs_archive 
  SELECT *, now() AS archived_at FROM moved;
  GET DIAGNOSTICS audit_count = ROW_COUNT;
  
  -- Archive analytics_events
  WITH moved AS (
    DELETE FROM public.analytics_events
    WHERE created_at < cutoff_date
    RETURNING *
  )
  INSERT INTO public.analytics_events_archive
  SELECT *, now() AS archived_at FROM moved;
  GET DIAGNOSTICS analytics_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'audit_logs_archived', audit_count,
    'analytics_events_archived', analytics_count,
    'cutoff_date', cutoff_date
  );
END;
$$;

-- Enable pg_cron and pg_net extensions for scheduled archiving
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

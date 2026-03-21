
-- Analytics events table for tracking user actions
CREATE TABLE public.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  event_name text NOT NULL,
  event_category text NOT NULL DEFAULT 'general',
  event_data jsonb DEFAULT '{}'::jsonb,
  page_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for querying by date and event
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events (created_at DESC);
CREATE INDEX idx_analytics_events_name ON public.analytics_events (event_name, created_at DESC);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert events
CREATE POLICY "Authenticated users can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view analytics events"
  ON public.analytics_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete analytics
CREATE POLICY "Admins can delete analytics events"
  ON public.analytics_events FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

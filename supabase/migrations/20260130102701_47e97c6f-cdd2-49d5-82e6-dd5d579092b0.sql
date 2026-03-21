-- Create import_history table for tracking all data import operations
CREATE TABLE public.import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  imported_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  total_tables INTEGER DEFAULT 0,
  total_records INTEGER DEFAULT 0,
  success_tables INTEGER DEFAULT 0,
  success_records INTEGER DEFAULT 0,
  failed_tables INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin can manage import history"
ON public.import_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for viewing
CREATE POLICY "Admin and accountant can view import history"
ON public.import_history
FOR SELECT
USING (is_admin_or_accountant(auth.uid()));

-- Add audit log trigger
CREATE TRIGGER audit_import_history_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.import_history
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
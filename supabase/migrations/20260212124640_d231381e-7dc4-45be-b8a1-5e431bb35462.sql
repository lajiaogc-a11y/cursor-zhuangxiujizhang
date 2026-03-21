
-- 1. Category name sync triggers
CREATE OR REPLACE FUNCTION public.sync_category_name_to_transactions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    UPDATE public.transactions
    SET category_name = NEW.name
    WHERE category_name = OLD.name
      AND ledger_type IN ('company_daily', 'exchange');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_category_name_trigger
AFTER UPDATE ON public.transaction_categories
FOR EACH ROW
EXECUTE FUNCTION public.sync_category_name_to_transactions();

CREATE OR REPLACE FUNCTION public.sync_project_category_name_to_transactions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    UPDATE public.transactions
    SET category_name = NEW.name
    WHERE category_name = OLD.name
      AND ledger_type = 'project';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_project_category_name_trigger
AFTER UPDATE ON public.project_categories
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_category_name_to_transactions();

-- 2. Bank reconciliation tables
CREATE TABLE public.bank_import_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name text NOT NULL,
  file_size integer,
  account_currency text NOT NULL DEFAULT 'MYR',
  account_type text NOT NULL DEFAULT 'bank',
  total_records integer NOT NULL DEFAULT 0,
  matched_records integer NOT NULL DEFAULT 0,
  unmatched_records integer NOT NULL DEFAULT 0,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by uuid
);

ALTER TABLE public.bank_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or accountant can manage bank import batches"
ON public.bank_import_batches FOR ALL
USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Users with permission can view bank import batches"
ON public.bank_import_batches FOR SELECT
USING (has_nav_permission(auth.uid(), 'nav.bank_reconciliation'));

CREATE TABLE public.bank_statements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_batch_id uuid NOT NULL REFERENCES public.bank_import_batches(id) ON DELETE CASCADE,
  account_currency text NOT NULL DEFAULT 'MYR',
  account_type text NOT NULL DEFAULT 'bank',
  statement_date date NOT NULL,
  description text NOT NULL DEFAULT '',
  debit_amount numeric NOT NULL DEFAULT 0,
  credit_amount numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  matched_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  match_status text NOT NULL DEFAULT 'unmatched',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or accountant can manage bank statements"
ON public.bank_statements FOR ALL
USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Users with permission can view bank statements"
ON public.bank_statements FOR SELECT
USING (has_nav_permission(auth.uid(), 'nav.bank_reconciliation'));

-- Add audit triggers for bank tables
CREATE TRIGGER audit_bank_import_batches
AFTER INSERT OR UPDATE OR DELETE ON public.bank_import_batches
FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

CREATE TRIGGER audit_bank_statements
AFTER INSERT OR UPDATE OR DELETE ON public.bank_statements
FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

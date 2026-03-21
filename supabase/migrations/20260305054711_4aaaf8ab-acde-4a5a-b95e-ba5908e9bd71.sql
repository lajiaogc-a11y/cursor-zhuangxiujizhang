
-- P0: Add currency column to q_purchase_orders
ALTER TABLE public.q_purchase_orders ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'MYR';

-- P0: Add currency column to q_project_breakdowns
ALTER TABLE public.q_project_breakdowns ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'MYR';

-- P1: Add performance indexes on transactions
CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON public.transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON public.transactions(currency);

-- P0: Add audit triggers to key q_ tables
CREATE TRIGGER audit_q_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.q_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_q_quotations
  AFTER INSERT OR UPDATE OR DELETE ON public.q_quotations
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_q_project_breakdowns
  AFTER INSERT OR UPDATE OR DELETE ON public.q_project_breakdowns
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_q_purchase_order_items
  AFTER INSERT OR UPDATE OR DELETE ON public.q_purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_q_inventory
  AFTER INSERT OR UPDATE OR DELETE ON public.q_inventory
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

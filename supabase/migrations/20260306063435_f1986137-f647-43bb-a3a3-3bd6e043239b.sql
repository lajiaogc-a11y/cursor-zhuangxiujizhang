-- Add source_record_id to payables for linking back to purchase orders
ALTER TABLE public.payables ADD COLUMN IF NOT EXISTS source_record_id uuid;

-- Create index for lookup
CREATE INDEX IF NOT EXISTS idx_payables_source_record_id ON public.payables(source_record_id);

-- Trigger function: when payable_payments change, sync back to PO
CREATE OR REPLACE FUNCTION public.sync_po_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payable RECORD;
  v_total_paid numeric;
BEGIN
  -- Get the payable for the affected payment
  SELECT id, source_record_id, total_amount
    INTO v_payable
    FROM public.payables
   WHERE id = COALESCE(NEW.payable_id, OLD.payable_id);

  -- Only proceed if this payable is linked to a PO
  IF v_payable.source_record_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Sum all payments for this payable
  SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM public.payable_payments
   WHERE payable_id = v_payable.id;

  -- Update the linked purchase order
  UPDATE public.q_purchase_orders
     SET paid_amount = v_total_paid,
         payment_status = CASE
           WHEN v_total_paid >= v_payable.total_amount THEN 'paid'
           WHEN v_total_paid > 0 THEN 'partial'
           ELSE 'unpaid'
         END,
         updated_at = now()
   WHERE id = v_payable.source_record_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to payable_payments
DROP TRIGGER IF EXISTS trg_sync_po_payment ON public.payable_payments;
CREATE TRIGGER trg_sync_po_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.payable_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_po_payment_status();

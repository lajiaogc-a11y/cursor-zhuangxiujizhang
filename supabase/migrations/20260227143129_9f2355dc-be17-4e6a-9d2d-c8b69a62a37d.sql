
-- PO Attachments
CREATE TABLE IF NOT EXISTS public.q_po_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.q_purchase_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'other',
  file_size BIGINT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.q_po_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage q_po_attachments" ON public.q_po_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PO Audit Logs
CREATE TABLE IF NOT EXISTS public.q_po_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.q_purchase_orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.q_po_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage q_po_audit_logs" ON public.q_po_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Purchase Payments
CREATE TABLE IF NOT EXISTS public.q_purchase_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.q_purchase_orders(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference_no TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.q_purchase_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage q_purchase_payments" ON public.q_purchase_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Purchase Receivings
CREATE TABLE IF NOT EXISTS public.q_purchase_receivings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.q_purchase_orders(id) ON DELETE CASCADE,
  receiving_no TEXT NOT NULL,
  receiving_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.q_purchase_receivings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage q_purchase_receivings" ON public.q_purchase_receivings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Purchase Receiving Items
CREATE TABLE IF NOT EXISTS public.q_purchase_receiving_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_id UUID NOT NULL REFERENCES public.q_purchase_receivings(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES public.q_purchase_order_items(id),
  material_id UUID,
  received_quantity NUMERIC NOT NULL DEFAULT 0,
  exception_notes TEXT,
  photos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.q_purchase_receiving_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage q_purchase_receiving_items" ON public.q_purchase_receiving_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add missing columns to q_purchase_orders if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='q_purchase_orders' AND column_name='submitted_to_finance_at') THEN
    ALTER TABLE public.q_purchase_orders ADD COLUMN submitted_to_finance_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='q_purchase_orders' AND column_name='submitted_to_finance_by') THEN
    ALTER TABLE public.q_purchase_orders ADD COLUMN submitted_to_finance_by UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='q_purchase_orders' AND column_name='project_breakdown_id') THEN
    ALTER TABLE public.q_purchase_orders ADD COLUMN project_breakdown_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='q_purchase_orders' AND column_name='updated_at') THEN
    ALTER TABLE public.q_purchase_orders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='q_purchase_orders' AND column_name='created_by') THEN
    ALTER TABLE public.q_purchase_orders ADD COLUMN created_by UUID;
  END IF;
END $$;

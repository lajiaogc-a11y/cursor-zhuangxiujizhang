
-- Add ON DELETE CASCADE to invoice_items -> invoices foreign key
ALTER TABLE public.invoice_items 
  DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey,
  ADD CONSTRAINT invoice_items_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

-- Add ON DELETE CASCADE to bank_statements -> bank_import_batches foreign key
ALTER TABLE public.bank_statements 
  DROP CONSTRAINT IF EXISTS bank_statements_import_batch_id_fkey,
  ADD CONSTRAINT bank_statements_import_batch_id_fkey 
    FOREIGN KEY (import_batch_id) REFERENCES public.bank_import_batches(id) ON DELETE CASCADE;

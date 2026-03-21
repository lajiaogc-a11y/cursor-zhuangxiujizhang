
-- Add sort_order to q_worker_types
ALTER TABLE public.q_worker_types ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Add created_by to q_labor_rates if missing
ALTER TABLE public.q_labor_rates ADD COLUMN IF NOT EXISTS created_by uuid;

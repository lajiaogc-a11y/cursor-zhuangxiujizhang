-- Add include_in_stats column to company_accounts table
ALTER TABLE public.company_accounts ADD COLUMN IF NOT EXISTS include_in_stats BOOLEAN DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.company_accounts.include_in_stats IS 'Whether this account balance should be included in platform statistics';
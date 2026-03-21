
-- Drop the old unique constraint that doesn't include tenant_id
ALTER TABLE public.company_accounts DROP CONSTRAINT IF EXISTS company_accounts_currency_account_type_key;

-- Add new unique constraint that includes tenant_id for multi-tenant isolation
ALTER TABLE public.company_accounts ADD CONSTRAINT company_accounts_tenant_currency_account_type_key UNIQUE (tenant_id, currency, account_type);

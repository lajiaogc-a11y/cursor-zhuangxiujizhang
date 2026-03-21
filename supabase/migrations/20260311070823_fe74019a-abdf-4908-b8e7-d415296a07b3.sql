
-- 1. Extend contacts table with CRM fields
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS lead_source text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lead_status text DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS property_address text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS property_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_budget numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_follow_up date DEFAULT NULL;

-- 2. Create contact_activities table (follow-up records / timeline)
CREATE TABLE public.contact_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'note',
  content text NOT NULL,
  next_follow_up date DEFAULT NULL,
  created_by uuid DEFAULT NULL,
  tenant_id uuid DEFAULT public.get_user_tenant_id() REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create contact_reminders table
CREATE TABLE public.contact_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  title text NOT NULL,
  remind_at timestamptz NOT NULL,
  is_completed boolean DEFAULT false,
  created_by uuid DEFAULT NULL,
  tenant_id uuid DEFAULT public.get_user_tenant_id() REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_reminders ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for contact_activities
CREATE POLICY "Tenant users can manage contact_activities"
ON public.contact_activities
FOR ALL
TO authenticated
USING (
  tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
  AND public.is_admin_or_accountant(auth.uid())
)
WITH CHECK (
  tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
  AND public.is_admin_or_accountant(auth.uid())
);

-- 6. RLS policies for contact_reminders
CREATE POLICY "Tenant users can manage contact_reminders"
ON public.contact_reminders
FOR ALL
TO authenticated
USING (
  tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
  AND public.is_admin_or_accountant(auth.uid())
)
WITH CHECK (
  tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
  AND public.is_admin_or_accountant(auth.uid())
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_contact_activities_contact_id ON public.contact_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_tenant_id ON public.contact_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_reminders_contact_id ON public.contact_reminders(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_reminders_tenant_id ON public.contact_reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_status ON public.contacts(lead_status);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_source ON public.contacts(lead_source);

-- 8. Audit triggers
CREATE TRIGGER audit_contact_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.contact_activities
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

CREATE TRIGGER audit_contact_reminders
  AFTER INSERT OR UPDATE OR DELETE ON public.contact_reminders
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

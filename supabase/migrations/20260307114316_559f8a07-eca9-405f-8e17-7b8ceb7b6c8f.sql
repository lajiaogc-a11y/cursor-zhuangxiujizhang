
-- Ensure the default tenant exists before any FK constraints reference it
-- This fixes the publish error where tenant_id FK violations occur
INSERT INTO public.tenants (id, name, slug, plan, status, max_members)
VALUES ('00000000-0000-0000-0000-000000000001', '默认公司', 'default', 'enterprise', 'active', 100)
ON CONFLICT (id) DO NOTHING;

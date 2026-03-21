
DROP VIEW IF EXISTS public.transactions_with_details;

CREATE VIEW public.transactions_with_details
WITH (security_invoker=on) AS
SELECT t.id,
    t.sequence_no,
    t.transaction_date,
    t.category_id,
    t.category_name,
    t.summary,
    t.type,
    t.amount,
    t.currency,
    t.account_type,
    t.exchange_rate,
    t.amount_myr,
    t.project_id,
    t.receipt_url_1,
    t.receipt_url_2,
    t.remark_1,
    t.remark_2,
    t.ledger_type,
    t.created_by,
    t.created_at,
    t.tenant_id,
    p.display_name AS creator_name,
    proj.project_code,
    proj.project_name
FROM ((transactions t
    LEFT JOIN profiles p ON ((t.created_by = p.user_id)))
    LEFT JOIN projects proj ON ((t.project_id = proj.id)));


CREATE OR REPLACE FUNCTION public.delete_transaction_with_balance(
  _transaction_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx RECORD;
BEGIN
  -- 1. Get transaction data
  SELECT * INTO tx FROM public.transactions WHERE id = _transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- 2. Delete the transaction (triggers audit log automatically)
  DELETE FROM public.transactions WHERE id = _transaction_id;

  -- 3. Update account balance atomically
  UPDATE public.company_accounts
  SET balance = balance + CASE WHEN tx.type = 'income' THEN -tx.amount ELSE tx.amount END,
      updated_at = now()
  WHERE currency = tx.currency::currency_type
    AND account_type = tx.account_type::account_type;

  -- 4. Update project summary if applicable
  IF tx.project_id IS NOT NULL AND tx.ledger_type = 'project' THEN
    IF tx.type = 'income' THEN
      UPDATE public.projects
      SET total_income_myr = GREATEST(0, COALESCE(total_income_myr, 0) - tx.amount_myr),
          net_profit_myr = GREATEST(0, COALESCE(total_income_myr, 0) - tx.amount_myr) +
            COALESCE((SELECT SUM(amount_myr) FROM project_additions WHERE project_id = tx.project_id AND is_paid = true), 0) -
            COALESCE(total_expense_myr, 0),
          updated_at = now()
      WHERE id = tx.project_id;
    ELSE
      UPDATE public.projects
      SET total_expense_myr = GREATEST(0, COALESCE(total_expense_myr, 0) - tx.amount_myr),
          net_profit_myr = COALESCE(total_income_myr, 0) +
            COALESCE((SELECT SUM(amount_myr) FROM project_additions WHERE project_id = tx.project_id AND is_paid = true), 0) -
            GREATEST(0, COALESCE(total_expense_myr, 0) - tx.amount_myr),
          updated_at = now()
      WHERE id = tx.project_id;
    END IF;
  END IF;
END;
$$;


CREATE OR REPLACE FUNCTION public.recalculate_project_summary(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calc_income numeric;
  calc_expense numeric;
  calc_material numeric;
  calc_labor numeric;
  calc_other numeric;
  calc_addition numeric;
  calc_paid_addition numeric;
BEGIN
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount_myr ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_myr ELSE 0 END), 0)
  INTO calc_income, calc_expense
  FROM transactions 
  WHERE project_id = _project_id AND ledger_type = 'project';

  SELECT 
    COALESCE(SUM(CASE WHEN category = 'material' THEN amount_myr ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'labor' THEN amount_myr ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'other' THEN amount_myr ELSE 0 END), 0)
  INTO calc_material, calc_labor, calc_other
  FROM project_expenses WHERE project_id = _project_id;

  SELECT COALESCE(SUM(amount_myr), 0)
  INTO calc_addition
  FROM project_additions WHERE project_id = _project_id;

  SELECT COALESCE(SUM(amount_myr), 0)
  INTO calc_paid_addition
  FROM project_additions WHERE project_id = _project_id AND is_paid = true;

  UPDATE projects SET
    total_income_myr = calc_income,
    total_expense_myr = calc_expense,
    total_material_myr = calc_material,
    total_labor_myr = calc_labor,
    total_other_expense_myr = calc_other,
    total_addition_myr = calc_addition,
    net_profit_myr = calc_income + calc_paid_addition - calc_expense,
    updated_at = now()
  WHERE id = _project_id;
END;
$$;


-- ============================================
-- Phase 2 Batch 3: Update trigger functions to propagate tenant_id
-- ============================================

-- 1. sync_exchange_to_transactions - add tenant_id propagation
CREATE OR REPLACE FUNCTION public.sync_exchange_to_transactions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_id, category_name,
      summary, amount, currency, account_type, exchange_rate, amount_myr,
      remark_1, remark_2, created_by, tenant_id
    ) VALUES (
      NEW.transaction_date, 'expense', 'exchange', NULL, '换汇支出',
      '换出 ' || NEW.out_currency || ' → ' || NEW.in_currency,
      NEW.out_amount, NEW.out_currency, NEW.out_account_type,
      CASE WHEN NEW.out_currency = 'MYR' THEN 1 ELSE NEW.exchange_rate END,
      NEW.out_amount_myr, '换汇交易', NEW.remark, NEW.created_by, NEW.tenant_id
    );
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_id, category_name,
      summary, amount, currency, account_type, exchange_rate, amount_myr,
      remark_1, remark_2, created_by, tenant_id
    ) VALUES (
      NEW.transaction_date, 'income', 'exchange', NULL, '换汇收入',
      '换入 ' || NEW.in_currency || ' ← ' || NEW.out_currency,
      NEW.in_amount, NEW.in_currency, NEW.in_account_type,
      CASE WHEN NEW.in_currency = 'MYR' THEN 1 ELSE NEW.exchange_rate END,
      NEW.in_amount_myr, '换汇交易', NEW.remark, NEW.created_by, NEW.tenant_id
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions SET
      transaction_date = NEW.transaction_date,
      summary = '换出 ' || NEW.out_currency || ' → ' || NEW.in_currency,
      amount = NEW.out_amount, currency = NEW.out_currency,
      account_type = NEW.out_account_type, amount_myr = NEW.out_amount_myr,
      remark_2 = NEW.remark
    WHERE remark_1 = '换汇交易' AND type = 'expense'
      AND transaction_date = OLD.transaction_date
      AND created_by = OLD.created_by AND summary LIKE '换出%';
    UPDATE public.transactions SET
      transaction_date = NEW.transaction_date,
      summary = '换入 ' || NEW.in_currency || ' ← ' || NEW.out_currency,
      amount = NEW.in_amount, currency = NEW.in_currency,
      account_type = NEW.in_account_type, amount_myr = NEW.in_amount_myr,
      remark_2 = NEW.remark
    WHERE remark_1 = '换汇交易' AND type = 'income'
      AND transaction_date = OLD.transaction_date
      AND created_by = OLD.created_by AND summary LIKE '换入%';
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions 
    WHERE remark_1 = '换汇交易'
      AND transaction_date = OLD.transaction_date
      AND created_by = OLD.created_by;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. sync_project_payment_to_transaction
CREATE OR REPLACE FUNCTION public.sync_project_payment_to_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  stage_name TEXT;
BEGIN
  stage_name := CASE NEW.payment_stage
    WHEN 'deposit_1' THEN '首期订金'
    WHEN 'deposit_2' THEN '二期订金'
    WHEN 'progress_3' THEN '三期进度款'
    WHEN 'progress_4' THEN '四期进度款'
    WHEN 'final_5' THEN '尾款'
    ELSE NEW.payment_stage::text
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_id, category_name,
      summary, amount, currency, account_type, exchange_rate, amount_myr,
      project_id, remark_1, remark_2, created_by, tenant_id
    ) VALUES (
      NEW.payment_date, 'income', 'project', NULL, '项目收款',
      stage_name, NEW.amount, NEW.currency, NEW.account_type,
      NEW.exchange_rate, NEW.amount_myr, NEW.project_id,
      '项目收款', NEW.remark, NEW.created_by, NEW.tenant_id
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions SET
      transaction_date = NEW.payment_date, summary = stage_name,
      amount = NEW.amount, currency = NEW.currency,
      account_type = NEW.account_type, exchange_rate = NEW.exchange_rate,
      amount_myr = NEW.amount_myr, remark_2 = NEW.remark
    WHERE project_id = OLD.project_id AND remark_1 = '项目收款'
      AND transaction_date = OLD.payment_date;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions 
    WHERE project_id = OLD.project_id AND remark_1 = '项目收款'
      AND transaction_date = OLD.payment_date;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 3. sync_project_expense_to_transaction
CREATE OR REPLACE FUNCTION public.sync_project_expense_to_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_id, category_name,
      summary, amount, currency, account_type, exchange_rate, amount_myr,
      project_id, remark_1, remark_2, created_by, tenant_id
    ) VALUES (
      NEW.expense_date, 'expense', 'project', NULL,
      CASE NEW.category
        WHEN 'material' THEN '材料费'
        WHEN 'labor' THEN '人工费'
        WHEN 'other' THEN '其他费用'
        ELSE NEW.category::text
      END,
      NEW.description, NEW.amount, NEW.currency, NEW.account_type,
      NEW.exchange_rate, NEW.amount_myr, NEW.project_id,
      '项目支出', NEW.remark, NEW.created_by, NEW.tenant_id
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions SET
      transaction_date = NEW.expense_date,
      category_name = CASE NEW.category
        WHEN 'material' THEN '材料费'
        WHEN 'labor' THEN '人工费'
        WHEN 'other' THEN '其他费用'
        ELSE NEW.category::text
      END,
      summary = NEW.description, amount = NEW.amount,
      currency = NEW.currency, account_type = NEW.account_type,
      exchange_rate = NEW.exchange_rate, amount_myr = NEW.amount_myr,
      remark_2 = NEW.remark
    WHERE project_id = OLD.project_id AND remark_1 = '项目支出'
      AND summary = OLD.description AND transaction_date = OLD.expense_date;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions 
    WHERE project_id = OLD.project_id AND remark_1 = '项目支出'
      AND summary = OLD.description AND transaction_date = OLD.expense_date;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 4. sync_project_addition_payment
CREATE OR REPLACE FUNCTION public.sync_project_addition_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  project_rec RECORD;
BEGIN
  SELECT project_code, project_name INTO project_rec
  FROM public.projects WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  IF TG_OP = 'INSERT' AND NEW.is_paid = true THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_id, category_name,
      summary, amount, currency, account_type, exchange_rate, amount_myr,
      project_id, remark_1, remark_2, created_by, tenant_id
    ) VALUES (
      NEW.addition_date, 'income', 'project', NULL, '增项收款',
      '[' || COALESCE(project_rec.project_code, '') || '] ' || NEW.description,
      NEW.amount, NEW.currency, 'bank', NEW.exchange_rate, NEW.amount_myr,
      NEW.project_id, '增项收款', COALESCE(NEW.remark, ''), NEW.created_by, NEW.tenant_id
    );
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_paid = true AND (OLD.is_paid = false OR OLD.is_paid IS NULL) THEN
      INSERT INTO public.transactions (
        transaction_date, type, ledger_type, category_id, category_name,
        summary, amount, currency, account_type, exchange_rate, amount_myr,
        project_id, remark_1, remark_2, created_by, tenant_id
      ) VALUES (
        NEW.addition_date, 'income', 'project', NULL, '增项收款',
        '[' || COALESCE(project_rec.project_code, '') || '] ' || NEW.description,
        NEW.amount, NEW.currency, 'bank', NEW.exchange_rate, NEW.amount_myr,
        NEW.project_id, '增项收款', COALESCE(NEW.remark, ''), NEW.created_by, NEW.tenant_id
      );
    END IF;
    IF NEW.is_paid = false AND OLD.is_paid = true THEN
      DELETE FROM public.transactions 
      WHERE category_name = '增项收款' AND project_id = OLD.project_id
        AND summary LIKE '%' || OLD.description || '%'
        AND transaction_date = OLD.addition_date;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' AND OLD.is_paid = true THEN
    DELETE FROM public.transactions 
    WHERE category_name = '增项收款' AND project_id = OLD.project_id
      AND summary LIKE '%' || OLD.description || '%'
      AND transaction_date = OLD.addition_date;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 5. sync_salary_payment_to_transaction
CREATE OR REPLACE FUNCTION public.sync_salary_payment_to_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  emp_name text;
BEGIN
  SELECT name INTO emp_name FROM public.employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_name,
      summary, amount, currency, account_type,
      exchange_rate, amount_myr, remark_1, remark_2, created_by, tenant_id
    ) VALUES (
      NEW.payment_date, 'expense', 'company_daily', '工资发放',
      NEW.payment_month || ' 工资 - ' || COALESCE(emp_name, ''),
      NEW.net_salary, NEW.currency, NEW.account_type,
      NEW.exchange_rate, NEW.amount_myr, '工资账单', NEW.remark, NEW.created_by, NEW.tenant_id
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions SET
      transaction_date = NEW.payment_date,
      summary = NEW.payment_month || ' 工资 - ' || COALESCE(emp_name, ''),
      amount = NEW.net_salary, currency = NEW.currency,
      account_type = NEW.account_type, exchange_rate = NEW.exchange_rate,
      amount_myr = NEW.amount_myr, remark_2 = NEW.remark
    WHERE remark_1 = '工资账单' AND category_name = '工资发放'
      AND transaction_date = OLD.payment_date
      AND summary LIKE OLD.payment_month || '%';
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions 
    WHERE remark_1 = '工资账单' AND category_name = '工资发放'
      AND transaction_date = OLD.payment_date
      AND summary LIKE OLD.payment_month || '%' || emp_name || '%';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 6. sync_salary_advance_to_transaction
CREATE OR REPLACE FUNCTION public.sync_salary_advance_to_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  emp_name text;
BEGIN
  SELECT name INTO emp_name FROM public.employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_name,
      summary, amount, currency, account_type,
      exchange_rate, amount_myr, remark_1, remark_2, created_by, tenant_id
    ) VALUES (
      NEW.advance_date, 'expense', 'company_daily', '工资预支',
      '员工预支 - ' || COALESCE(emp_name, ''),
      NEW.amount, NEW.currency, NEW.account_type,
      NEW.exchange_rate, NEW.amount_myr, '工资账单', NEW.remark, NEW.created_by, NEW.tenant_id
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions SET
      transaction_date = NEW.advance_date,
      summary = '员工预支 - ' || COALESCE(emp_name, ''),
      amount = NEW.amount, currency = NEW.currency,
      account_type = NEW.account_type, exchange_rate = NEW.exchange_rate,
      amount_myr = NEW.amount_myr, remark_2 = NEW.remark
    WHERE remark_1 = '工资账单' AND category_name = '工资预支'
      AND transaction_date = OLD.advance_date
      AND summary LIKE '%' || (SELECT name FROM public.employees WHERE id = OLD.employee_id) || '%';
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions 
    WHERE remark_1 = '工资账单' AND category_name = '工资预支'
      AND transaction_date = OLD.advance_date
      AND summary LIKE '%' || emp_name || '%';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 7. sync_insurance_payment_to_transaction
CREATE OR REPLACE FUNCTION public.sync_insurance_payment_to_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  emp_name text;
BEGIN
  SELECT name INTO emp_name FROM public.employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_name,
      summary, amount, currency, account_type,
      exchange_rate, amount_myr, remark_1, remark_2, created_by, tenant_id
    ) VALUES (
      NEW.payment_date, 'expense', 'company_daily', '保险缴纳',
      NEW.payment_month || ' ' || NEW.insurance_type || ' - ' || COALESCE(emp_name, ''),
      NEW.total_amount, NEW.currency, NEW.account_type,
      1, NEW.amount_myr, '工资账单', NEW.remark, NEW.created_by, NEW.tenant_id
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions SET
      transaction_date = NEW.payment_date,
      summary = NEW.payment_month || ' ' || NEW.insurance_type || ' - ' || COALESCE(emp_name, ''),
      amount = NEW.total_amount, currency = NEW.currency,
      account_type = NEW.account_type, amount_myr = NEW.amount_myr,
      remark_2 = NEW.remark
    WHERE remark_1 = '工资账单' AND category_name = '保险缴纳'
      AND transaction_date = OLD.payment_date
      AND summary LIKE OLD.payment_month || '%' || OLD.insurance_type || '%';
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions 
    WHERE remark_1 = '工资账单' AND category_name = '保险缴纳'
      AND transaction_date = OLD.payment_date
      AND summary LIKE OLD.payment_month || '%' || OLD.insurance_type || '%' || emp_name || '%';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 8. sync_payable_payment_to_transaction
CREATE OR REPLACE FUNCTION public.sync_payable_payment_to_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supplier text;
  payable_remark text;
  payable_record_type text;
  txn_type text;
  txn_category text;
  txn_summary_suffix text;
BEGIN
  SELECT supplier_name, remark, record_type INTO supplier, payable_remark, payable_record_type
  FROM public.payables
  WHERE id = COALESCE(NEW.payable_id, OLD.payable_id);

  IF payable_record_type = 'receivable' THEN
    txn_type := 'income'; txn_category := '待收账款'; txn_summary_suffix := ' 收款';
  ELSE
    txn_type := 'expense'; txn_category := '应付账款'; txn_summary_suffix := ' 付款';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_name,
      summary, amount, currency, account_type,
      exchange_rate, amount_myr, remark_1, remark_2, created_by, tenant_id
    ) VALUES (
      NEW.payment_date, txn_type::transaction_type, 'company_daily', txn_category,
      COALESCE(supplier, '') || txn_summary_suffix,
      NEW.amount, NEW.currency, NEW.account_type,
      NEW.exchange_rate, NEW.amount_myr, txn_category, NEW.remark, NEW.created_by, NEW.tenant_id
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions SET
      transaction_date = NEW.payment_date, type = txn_type::transaction_type,
      category_name = txn_category,
      summary = COALESCE(supplier, '') || txn_summary_suffix,
      amount = NEW.amount, currency = NEW.currency,
      account_type = NEW.account_type, exchange_rate = NEW.exchange_rate,
      amount_myr = NEW.amount_myr, remark_2 = NEW.remark
    WHERE remark_1 IN ('应付账款', '待收账款')
      AND category_name IN ('应付账款', '待收账款')
      AND transaction_date = OLD.payment_date
      AND amount = OLD.amount AND created_by = OLD.created_by;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions
    WHERE remark_1 IN ('应付账款', '待收账款')
      AND category_name IN ('应付账款', '待收账款')
      AND transaction_date = OLD.payment_date
      AND amount = OLD.amount AND created_by = OLD.created_by;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 9. generate_project_alerts - add tenant_id
CREATE OR REPLACE FUNCTION public.generate_project_alerts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rule RECORD;
  project RECORD;
  alert_msg TEXT;
  days_until INT;
  calc_balance NUMERIC;
  acc RECORD;
  tx_sum NUMERIC;
BEGIN
  FOR rule IN 
    SELECT * FROM public.alert_rules WHERE is_active = true
  LOOP
    IF rule.rule_type = 'delivery_upcoming' THEN
      FOR project IN 
        SELECT * FROM public.projects 
        WHERE status = 'in_progress' AND delivery_date IS NOT NULL
        AND delivery_date <= CURRENT_DATE + (rule.alert_days_before || ' days')::interval
        AND delivery_date >= CURRENT_DATE
        AND tenant_id = rule.tenant_id
      LOOP
        days_until := project.delivery_date - CURRENT_DATE;
        alert_msg := '项目 ' || project.project_code || ' 距离交货日期还有 ' || days_until || ' 天';
        IF NOT EXISTS (
          SELECT 1 FROM public.project_alerts 
          WHERE project_id = project.id AND alert_type = 'delivery_upcoming' AND is_resolved = false
        ) THEN
          INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message, tenant_id)
          VALUES (project.id, 'delivery_upcoming', 
            CASE WHEN days_until <= 3 THEN 'danger'::alert_level ELSE 'warning'::alert_level END,
            alert_msg, project.tenant_id);
        END IF;
      END LOOP;
    END IF;

    IF rule.rule_type = 'warranty_expiring' THEN
      FOR project IN 
        SELECT * FROM public.projects 
        WHERE status = 'completed' AND warranty_end_date IS NOT NULL
        AND warranty_end_date <= CURRENT_DATE + (rule.alert_days_before || ' days')::interval
        AND warranty_end_date >= CURRENT_DATE
        AND tenant_id = rule.tenant_id
      LOOP
        days_until := project.warranty_end_date - CURRENT_DATE;
        alert_msg := '项目 ' || project.project_code || ' 保修期将在 ' || days_until || ' 天后到期';
        IF NOT EXISTS (
          SELECT 1 FROM public.project_alerts 
          WHERE project_id = project.id AND alert_type = 'warranty_expiring' AND is_resolved = false
        ) THEN
          INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message, tenant_id)
          VALUES (project.id, 'warranty_expiring',
            CASE WHEN days_until <= 7 THEN 'danger'::alert_level ELSE 'warning'::alert_level END,
            alert_msg, project.tenant_id);
        END IF;
      END LOOP;
    END IF;

    IF rule.rule_type = 'final_payment_due' THEN
      FOR project IN 
        SELECT * FROM public.projects 
        WHERE status IN ('in_progress', 'completed')
        AND final_payment_date IS NOT NULL
        AND final_payment_date <= CURRENT_DATE + (rule.alert_days_before || ' days')::interval
        AND final_payment_date >= CURRENT_DATE
        AND (total_income_myr < contract_amount_myr)
        AND tenant_id = rule.tenant_id
      LOOP
        days_until := project.final_payment_date - CURRENT_DATE;
        alert_msg := '项目 ' || project.project_code || ' 尾款需在 ' || days_until || ' 天内收取';
        IF NOT EXISTS (
          SELECT 1 FROM public.project_alerts 
          WHERE project_id = project.id AND alert_type = 'final_payment_due' AND is_resolved = false
        ) THEN
          INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message, tenant_id)
          VALUES (project.id, 'final_payment_due',
            CASE WHEN days_until <= 3 THEN 'danger'::alert_level ELSE 'warning'::alert_level END,
            alert_msg, project.tenant_id);
        END IF;
      END LOOP;
    END IF;

    IF rule.rule_type = 'payment_overdue' THEN
      FOR project IN 
        SELECT * FROM public.projects 
        WHERE status IN ('in_progress', 'completed')
        AND final_payment_date IS NOT NULL AND final_payment_date < CURRENT_DATE
        AND (total_income_myr < contract_amount_myr)
        AND tenant_id = rule.tenant_id
      LOOP
        days_until := CURRENT_DATE - project.final_payment_date;
        alert_msg := '项目 ' || project.project_code || ' 尾款已逾期 ' || days_until || ' 天';
        IF NOT EXISTS (
          SELECT 1 FROM public.project_alerts 
          WHERE project_id = project.id AND alert_type = 'payment_overdue' AND is_resolved = false
        ) THEN
          INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message, tenant_id)
          VALUES (project.id, 'payment_overdue', 'danger'::alert_level, alert_msg, project.tenant_id);
        END IF;
      END LOOP;
    END IF;

    IF rule.rule_type = 'low_balance' AND rule.threshold_value IS NOT NULL THEN
      FOR acc IN 
        SELECT currency, account_type, COALESCE(balance, 0) AS initial_balance, tenant_id
        FROM public.company_accounts 
        WHERE include_in_stats = true
        AND (rule.account_currency IS NULL OR currency::text = rule.account_currency)
        AND (rule.account_type IS NULL OR account_type::text = rule.account_type)
        AND tenant_id = rule.tenant_id
      LOOP
        SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) INTO tx_sum
        FROM public.transactions
        WHERE currency::text = acc.currency::text AND account_type::text = acc.account_type::text
          AND tenant_id = acc.tenant_id;
        calc_balance := acc.initial_balance + tx_sum;
        IF calc_balance < rule.threshold_value THEN
          alert_msg := acc.currency || ' ' || 
            CASE acc.account_type::text WHEN 'cash' THEN '现金' ELSE '网银' END ||
            '余额 ' || to_char(calc_balance, 'FM999,999,999') || 
            ' 低于阈值 ' || to_char(rule.threshold_value, 'FM999,999,999');
          IF NOT EXISTS (
            SELECT 1 FROM public.project_alerts 
            WHERE alert_type = 'low_balance' AND is_resolved = false AND alert_message = alert_msg
          ) THEN
            INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message, tenant_id)
            VALUES (NULL, 'low_balance',
              CASE WHEN calc_balance < 0 THEN 'danger'::alert_level ELSE 'warning'::alert_level END,
              alert_msg, acc.tenant_id);
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$function$;

-- 10. log_audit_changes - add tenant_id awareness  
-- (audit_logs don't have tenant_id, so no change needed - they're system-level)

-- 11. handle_new_user_complete - update to also add user to default tenant
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_first_user BOOLEAN;
  assigned_role app_role;
  default_tenant_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  ) INTO is_first_user;
  
  IF is_first_user THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'viewer';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Auto-add new user to default tenant
  SELECT id INTO default_tenant_id FROM public.tenants ORDER BY created_at ASC LIMIT 1;
  IF default_tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (default_tenant_id, NEW.id, 
      CASE WHEN is_first_user THEN 'owner'::tenant_member_role ELSE 'member'::tenant_member_role END)
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

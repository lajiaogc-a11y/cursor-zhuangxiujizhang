
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
        WHERE status = 'in_progress' 
        AND delivery_date IS NOT NULL
        AND delivery_date <= CURRENT_DATE + (rule.alert_days_before || ' days')::interval
        AND delivery_date >= CURRENT_DATE
      LOOP
        days_until := project.delivery_date - CURRENT_DATE;
        alert_msg := '项目 ' || project.project_code || ' 距离交货日期还有 ' || days_until || ' 天';
        
        IF NOT EXISTS (
          SELECT 1 FROM public.project_alerts 
          WHERE project_id = project.id 
          AND alert_type = 'delivery_upcoming'
          AND is_resolved = false
        ) THEN
          INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message)
          VALUES (
            project.id, 
            'delivery_upcoming', 
            CASE WHEN days_until <= 3 THEN 'danger'::alert_level ELSE 'warning'::alert_level END,
            alert_msg
          );
        END IF;
      END LOOP;
    END IF;

    IF rule.rule_type = 'warranty_expiring' THEN
      FOR project IN 
        SELECT * FROM public.projects 
        WHERE status = 'completed'
        AND warranty_end_date IS NOT NULL
        AND warranty_end_date <= CURRENT_DATE + (rule.alert_days_before || ' days')::interval
        AND warranty_end_date >= CURRENT_DATE
      LOOP
        days_until := project.warranty_end_date - CURRENT_DATE;
        alert_msg := '项目 ' || project.project_code || ' 保修期将在 ' || days_until || ' 天后到期';
        
        IF NOT EXISTS (
          SELECT 1 FROM public.project_alerts 
          WHERE project_id = project.id 
          AND alert_type = 'warranty_expiring'
          AND is_resolved = false
        ) THEN
          INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message)
          VALUES (
            project.id, 
            'warranty_expiring', 
            CASE WHEN days_until <= 7 THEN 'danger'::alert_level ELSE 'warning'::alert_level END,
            alert_msg
          );
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
      LOOP
        days_until := project.final_payment_date - CURRENT_DATE;
        alert_msg := '项目 ' || project.project_code || ' 尾款需在 ' || days_until || ' 天内收取';
        
        IF NOT EXISTS (
          SELECT 1 FROM public.project_alerts 
          WHERE project_id = project.id 
          AND alert_type = 'final_payment_due'
          AND is_resolved = false
        ) THEN
          INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message)
          VALUES (
            project.id, 
            'final_payment_due', 
            CASE WHEN days_until <= 3 THEN 'danger'::alert_level ELSE 'warning'::alert_level END,
            alert_msg
          );
        END IF;
      END LOOP;
    END IF;

    IF rule.rule_type = 'payment_overdue' THEN
      FOR project IN 
        SELECT * FROM public.projects 
        WHERE status IN ('in_progress', 'completed')
        AND final_payment_date IS NOT NULL
        AND final_payment_date < CURRENT_DATE
        AND (total_income_myr < contract_amount_myr)
      LOOP
        days_until := CURRENT_DATE - project.final_payment_date;
        alert_msg := '项目 ' || project.project_code || ' 尾款已逾期 ' || days_until || ' 天';
        
        IF NOT EXISTS (
          SELECT 1 FROM public.project_alerts 
          WHERE project_id = project.id 
          AND alert_type = 'payment_overdue'
          AND is_resolved = false
        ) THEN
          INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message)
          VALUES (project.id, 'payment_overdue', 'danger'::alert_level, alert_msg);
        END IF;
      END LOOP;
    END IF;

    -- 余额不足预警 - 使用实时余额（初始余额 + 交易总额），只统计 include_in_stats = true 的账户
    IF rule.rule_type = 'low_balance' AND rule.threshold_value IS NOT NULL THEN
      FOR acc IN 
        SELECT currency, account_type, COALESCE(balance, 0) AS initial_balance
        FROM public.company_accounts 
        WHERE include_in_stats = true
        AND (rule.account_currency IS NULL OR currency::text = rule.account_currency)
        AND (rule.account_type IS NULL OR account_type::text = rule.account_type)
      LOOP
        -- 计算该账户的交易净额
        SELECT COALESCE(
          SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0
        ) INTO tx_sum
        FROM public.transactions
        WHERE currency::text = acc.currency::text 
          AND account_type::text = acc.account_type::text;
        
        calc_balance := acc.initial_balance + tx_sum;
        
        IF calc_balance < rule.threshold_value THEN
          alert_msg := acc.currency || ' ' || 
            CASE acc.account_type::text WHEN 'cash' THEN '现金' ELSE '网银' END ||
            '余额 ' || to_char(calc_balance, 'FM999,999,999') || 
            ' 低于阈值 ' || to_char(rule.threshold_value, 'FM999,999,999');
          
          IF NOT EXISTS (
            SELECT 1 FROM public.project_alerts 
            WHERE alert_type = 'low_balance'
            AND is_resolved = false
            AND alert_message = alert_msg
          ) THEN
            INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message)
            VALUES (NULL, 'low_balance', 
              CASE WHEN calc_balance < 0 THEN 'danger'::alert_level ELSE 'warning'::alert_level END,
              alert_msg);
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$function$;

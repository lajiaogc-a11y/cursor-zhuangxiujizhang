CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type AS ENUM (
    'cash',
    'bank'
);


--
-- Name: alert_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_level AS ENUM (
    'safe',
    'warning',
    'danger'
);


--
-- Name: alert_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_type AS ENUM (
    'profit_warning',
    'payment_warning',
    'delivery_warning',
    'delivery_upcoming',
    'warranty_expiring',
    'final_payment_due',
    'payment_overdue',
    'low_balance'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'accountant',
    'viewer',
    'project_manager'
);


--
-- Name: currency_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.currency_type AS ENUM (
    'MYR',
    'CNY',
    'USD'
);


--
-- Name: ledger_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ledger_type AS ENUM (
    'company_daily',
    'exchange',
    'project'
);


--
-- Name: payment_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_stage AS ENUM (
    'deposit_1',
    'deposit_2',
    'progress_3',
    'progress_4',
    'final_5'
);


--
-- Name: project_expense_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_expense_category AS ENUM (
    'material',
    'labor',
    'other'
);


--
-- Name: project_expense_category_v2; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_expense_category_v2 AS ENUM (
    'material',
    'project_management',
    'outsourcing',
    'transportation',
    'labor',
    'other'
);


--
-- Name: project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status AS ENUM (
    'in_progress',
    'completed',
    'paused'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'income',
    'expense'
);


--
-- Name: auto_assign_first_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_assign_first_admin() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- 检查是否已有任何用户角色记录
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  -- 如果是第一个用户，分配admin角色
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin');
  ELSE
    -- 否则分配默认viewer角色
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'viewer');
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: check_project_alerts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_project_alerts() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.generate_project_alerts();
  RETURN NEW;
END;
$$;


--
-- Name: check_project_profit_warnings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_project_profit_warnings() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  profit_rule RECORD;
  project_rec RECORD;
  profit_rate NUMERIC;
  threshold NUMERIC;
  alert_lvl alert_level;
BEGIN
  -- 获取利润率预警规则
  SELECT * INTO profit_rule 
  FROM alert_rules 
  WHERE rule_type = 'profit_warning' AND is_active = true 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  threshold := COALESCE(profit_rule.threshold_value, 10);
  
  -- 遍历所有进行中的项目
  FOR project_rec IN 
    SELECT 
      id,
      project_code,
      project_name,
      contract_amount_myr,
      COALESCE(total_income_myr, 0) + COALESCE(total_addition_myr, 0) as total_income,
      COALESCE(total_material_myr, 0) + COALESCE(total_labor_myr, 0) + COALESCE(total_other_expense_myr, 0) as total_expense
    FROM projects
    WHERE status = 'in_progress' AND contract_amount_myr > 0
  LOOP
    -- 计算利润率 = (收入 - 支出) / 合同金额 * 100
    profit_rate := ((project_rec.total_income - project_rec.total_expense) / project_rec.contract_amount_myr) * 100;
    
    -- 如果利润率低于阈值且没有未解决的同类预警
    IF profit_rate < threshold THEN
      -- 确定警报级别
      IF profit_rate < 0 THEN
        alert_lvl := 'danger'::alert_level;
      ELSE
        alert_lvl := 'warning'::alert_level;
      END IF;
      
      -- 检查是否已有未解决的预警
      IF NOT EXISTS (
        SELECT 1 FROM project_alerts 
        WHERE project_id = project_rec.id 
          AND alert_type = 'profit_warning' 
          AND is_resolved = false
      ) THEN
        -- 创建预警
        INSERT INTO project_alerts (project_id, alert_type, alert_level, alert_message)
        VALUES (
          project_rec.id,
          'profit_warning'::alert_type,
          alert_lvl,
          format('项目 %s (%s) 利润率为 %.1f%%，低于阈值 %.1f%%', 
            project_rec.project_name, project_rec.project_code, profit_rate, threshold)
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: generate_project_alerts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_project_alerts() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  rule RECORD;
  project RECORD;
  alert_msg TEXT;
  days_until INT;
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

    IF rule.rule_type = 'low_balance' AND rule.threshold_value IS NOT NULL THEN
      IF (SELECT COALESCE(SUM(balance), 0) FROM public.company_accounts WHERE currency = 'MYR') < rule.threshold_value THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.project_alerts 
          WHERE alert_type = 'low_balance'
          AND is_resolved = false
          AND created_at > CURRENT_DATE - INTERVAL '1 day'
        ) THEN
          INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message)
          VALUES (NULL, 'low_balance', 'danger'::alert_level, '马币账户余额不足');
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- 创建用户 profile
  INSERT INTO public.profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- 检查是否是第一个用户（user_roles表为空）
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  IF user_count = 0 THEN
    -- 第一个用户自动成为管理员
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_management_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_management_role(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'accountant', 'project_manager')
  )
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin_or_accountant(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_or_accountant(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'accountant')
  )
$$;


--
-- Name: log_audit_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_audit_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  table_display text;
  action_display text;
BEGIN
  -- Map table names to Chinese display names
  table_display := CASE TG_TABLE_NAME
    WHEN 'projects' THEN '工程项目'
    WHEN 'project_expenses' THEN '项目支出'
    WHEN 'project_additions' THEN '项目增项'
    WHEN 'project_payments' THEN '项目收款'
    WHEN 'transactions' THEN '公司收支'
    WHEN 'exchange_transactions' THEN '换汇交易'
    WHEN 'company_accounts' THEN '公司账户'
    ELSE TG_TABLE_NAME
  END;

  -- Map actions to Chinese display
  action_display := CASE TG_OP
    WHEN 'INSERT' THEN '新增'
    WHEN 'UPDATE' THEN '修改'
    WHEN 'DELETE' THEN '删除'
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, table_name, table_display_name, action, action_display, record_id, new_data)
    VALUES (auth.uid(), TG_TABLE_NAME, table_display, TG_OP, action_display, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, table_name, table_display_name, action, action_display, record_id, old_data, new_data)
    VALUES (auth.uid(), TG_TABLE_NAME, table_display, TG_OP, action_display, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, table_name, table_display_name, action, action_display, record_id, old_data)
    VALUES (auth.uid(), TG_TABLE_NAME, table_display, TG_OP, action_display, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: sync_exchange_to_transactions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_exchange_to_transactions() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 插入支出记录（换出）
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_id, category_name,
      summary, amount, currency, account_type, exchange_rate, amount_myr,
      remark_1, remark_2, created_by
    ) VALUES (
      NEW.transaction_date,
      'expense',
      'exchange',
      NULL,
      '换汇支出',
      '换出 ' || NEW.out_currency || ' → ' || NEW.in_currency,
      NEW.out_amount,
      NEW.out_currency,
      NEW.out_account_type,
      CASE WHEN NEW.out_currency = 'MYR' THEN 1 ELSE NEW.exchange_rate END,
      NEW.out_amount_myr,
      '换汇交易',
      NEW.remark,
      NEW.created_by
    );
    
    -- 插入收入记录（换入）
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_id, category_name,
      summary, amount, currency, account_type, exchange_rate, amount_myr,
      remark_1, remark_2, created_by
    ) VALUES (
      NEW.transaction_date,
      'income',
      'exchange',
      NULL,
      '换汇收入',
      '换入 ' || NEW.in_currency || ' ← ' || NEW.out_currency,
      NEW.in_amount,
      NEW.in_currency,
      NEW.in_account_type,
      CASE WHEN NEW.in_currency = 'MYR' THEN 1 ELSE NEW.exchange_rate END,
      NEW.in_amount_myr,
      '换汇交易',
      NEW.remark,
      NEW.created_by
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- 更新支出记录
    UPDATE public.transactions SET
      transaction_date = NEW.transaction_date,
      summary = '换出 ' || NEW.out_currency || ' → ' || NEW.in_currency,
      amount = NEW.out_amount,
      currency = NEW.out_currency,
      account_type = NEW.out_account_type,
      amount_myr = NEW.out_amount_myr,
      remark_2 = NEW.remark
    WHERE remark_1 = '换汇交易'
      AND type = 'expense'
      AND transaction_date = OLD.transaction_date
      AND created_by = OLD.created_by
      AND summary LIKE '换出%';
      
    -- 更新收入记录
    UPDATE public.transactions SET
      transaction_date = NEW.transaction_date,
      summary = '换入 ' || NEW.in_currency || ' ← ' || NEW.out_currency,
      amount = NEW.in_amount,
      currency = NEW.in_currency,
      account_type = NEW.in_account_type,
      amount_myr = NEW.in_amount_myr,
      remark_2 = NEW.remark
    WHERE remark_1 = '换汇交易'
      AND type = 'income'
      AND transaction_date = OLD.transaction_date
      AND created_by = OLD.created_by
      AND summary LIKE '换入%';
      
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions 
    WHERE remark_1 = '换汇交易'
      AND transaction_date = OLD.transaction_date
      AND created_by = OLD.created_by;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: sync_project_expense_to_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_project_expense_to_transaction() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_id, category_name,
      summary, amount, currency, account_type, exchange_rate, amount_myr,
      project_id, remark_1, remark_2, created_by
    ) VALUES (
      NEW.expense_date,
      'expense',
      'project',
      NULL,
      CASE NEW.category
        WHEN 'material' THEN '材料费'
        WHEN 'labor' THEN '人工费'
        WHEN 'other' THEN '其他费用'
        ELSE NEW.category::text
      END,
      NEW.description,
      NEW.amount,
      NEW.currency,
      NEW.account_type,
      NEW.exchange_rate,
      NEW.amount_myr,
      NEW.project_id,
      '项目支出',
      NEW.remark,
      NEW.created_by
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
      summary = NEW.description,
      amount = NEW.amount,
      currency = NEW.currency,
      account_type = NEW.account_type,
      exchange_rate = NEW.exchange_rate,
      amount_myr = NEW.amount_myr,
      remark_2 = NEW.remark
    WHERE project_id = OLD.project_id 
      AND remark_1 = '项目支出'
      AND summary = OLD.description
      AND transaction_date = OLD.expense_date;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions 
    WHERE project_id = OLD.project_id 
      AND remark_1 = '项目支出'
      AND summary = OLD.description
      AND transaction_date = OLD.expense_date;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: sync_project_payment_to_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_project_payment_to_transaction() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  stage_name TEXT;
BEGIN
  -- 获取阶段名称
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
      project_id, remark_1, remark_2, created_by
    ) VALUES (
      NEW.payment_date,
      'income',
      'project',
      NULL,
      '项目收款',
      stage_name,
      NEW.amount,
      NEW.currency,
      NEW.account_type,
      NEW.exchange_rate,
      NEW.amount_myr,
      NEW.project_id,
      '项目收款',
      NEW.remark,
      NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions SET
      transaction_date = NEW.payment_date,
      summary = stage_name,
      amount = NEW.amount,
      currency = NEW.currency,
      account_type = NEW.account_type,
      exchange_rate = NEW.exchange_rate,
      amount_myr = NEW.amount_myr,
      remark_2 = NEW.remark
    WHERE project_id = OLD.project_id 
      AND remark_1 = '项目收款'
      AND transaction_date = OLD.payment_date;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions 
    WHERE project_id = OLD.project_id 
      AND remark_1 = '项目收款'
      AND transaction_date = OLD.payment_date;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: sync_transaction_to_project(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_transaction_to_project() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- 只处理有project_id且ledger_type为'project'的记录
  -- 跳过从项目表同步过来的记录（通过remark_1判断）
  IF TG_OP = 'INSERT' THEN
    IF NEW.project_id IS NOT NULL AND NEW.ledger_type = 'project' 
       AND (NEW.remark_1 IS NULL OR NEW.remark_1 NOT LIKE '%来源: 项目%') THEN
      
      IF NEW.type = 'expense' THEN
        -- 创建项目支出记录
        INSERT INTO public.project_expenses (
          project_id, expense_date, description, amount, currency,
          exchange_rate, amount_myr, account_type, category, created_by, remark
        ) VALUES (
          NEW.project_id, NEW.transaction_date, NEW.summary, NEW.amount, NEW.currency,
          NEW.exchange_rate, NEW.amount_myr, NEW.account_type, 'other', NEW.created_by,
          '来源: 公司收支 | ID: ' || NEW.id::text
        );
      ELSIF NEW.type = 'income' AND NEW.category_name = '项目收款' THEN
        -- 创建项目收款记录
        INSERT INTO public.project_payments (
          project_id, payment_date, amount, currency, exchange_rate,
          amount_myr, account_type, payment_stage, created_by, remark
        ) VALUES (
          NEW.project_id, NEW.transaction_date, NEW.amount, NEW.currency, NEW.exchange_rate,
          NEW.amount_myr, NEW.account_type, 'progress_3', NEW.created_by,
          '来源: 公司收支 | ID: ' || NEW.id::text
        );
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.project_id IS NOT NULL AND NEW.ledger_type = 'project'
       AND (NEW.remark_1 IS NULL OR NEW.remark_1 NOT LIKE '%来源: 项目%') THEN
      
      IF NEW.type = 'expense' THEN
        UPDATE public.project_expenses SET
          expense_date = NEW.transaction_date,
          description = NEW.summary,
          amount = NEW.amount,
          currency = NEW.currency,
          exchange_rate = NEW.exchange_rate,
          amount_myr = NEW.amount_myr,
          account_type = NEW.account_type
        WHERE remark LIKE '%来源: 公司收支 | ID: ' || OLD.id::text || '%';
      ELSIF NEW.type = 'income' AND NEW.category_name = '项目收款' THEN
        UPDATE public.project_payments SET
          payment_date = NEW.transaction_date,
          amount = NEW.amount,
          currency = NEW.currency,
          exchange_rate = NEW.exchange_rate,
          amount_myr = NEW.amount_myr,
          account_type = NEW.account_type
        WHERE remark LIKE '%来源: 公司收支 | ID: ' || OLD.id::text || '%';
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.project_id IS NOT NULL AND OLD.ledger_type = 'project'
       AND (OLD.remark_1 IS NULL OR OLD.remark_1 NOT LIKE '%来源: 项目%') THEN
      
      IF OLD.type = 'expense' THEN
        DELETE FROM public.project_expenses 
        WHERE remark LIKE '%来源: 公司收支 | ID: ' || OLD.id::text || '%';
      ELSIF OLD.type = 'income' THEN
        DELETE FROM public.project_payments 
        WHERE remark LIKE '%来源: 公司收支 | ID: ' || OLD.id::text || '%';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: update_project_additions_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_project_additions_summary() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.projects SET
    total_addition_myr = COALESCE((
      SELECT SUM(amount_myr) FROM public.project_additions 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- 重新计算净利润
  UPDATE public.projects SET
    net_profit_myr = COALESCE(total_income_myr, 0) + COALESCE(total_addition_myr, 0) - COALESCE(total_expense_myr, 0)
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN NEW;
END;
$$;


--
-- Name: update_project_financials(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_project_financials() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- 更新项目的支出汇总
  UPDATE public.projects SET
    total_material_myr = COALESCE((
      SELECT SUM(amount_myr) FROM public.project_expenses 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND category = 'material'
    ), 0),
    total_labor_myr = COALESCE((
      SELECT SUM(amount_myr) FROM public.project_expenses 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND category = 'labor'
    ), 0),
    total_other_expense_myr = COALESCE((
      SELECT SUM(amount_myr) FROM public.project_expenses 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND category = 'other'
    ), 0),
    total_expense_myr = COALESCE((
      SELECT SUM(amount_myr) FROM public.project_expenses 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- 重新计算净利润
  UPDATE public.projects SET
    net_profit_myr = COALESCE(total_income_myr, 0) + COALESCE(total_addition_myr, 0) - COALESCE(total_expense_myr, 0)
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: alert_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name text NOT NULL,
    rule_type public.alert_type NOT NULL,
    threshold_value numeric(10,2),
    alert_days_before integer DEFAULT 7,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    table_name text,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    table_display_name text,
    action_display text,
    restored_at timestamp with time zone,
    restored_by uuid
);


--
-- Name: company_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    currency public.currency_type NOT NULL,
    account_type public.account_type NOT NULL,
    balance numeric(18,2) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_currency public.currency_type NOT NULL,
    to_currency public.currency_type NOT NULL,
    rate numeric(12,8) NOT NULL,
    rate_date date DEFAULT CURRENT_DATE NOT NULL,
    source text DEFAULT 'manual'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exchange_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sequence_no integer NOT NULL,
    transaction_date date NOT NULL,
    out_currency public.currency_type NOT NULL,
    out_amount numeric(18,2) NOT NULL,
    out_account_type public.account_type NOT NULL,
    in_currency public.currency_type NOT NULL,
    in_amount numeric(18,2) NOT NULL,
    in_account_type public.account_type NOT NULL,
    exchange_rate numeric(12,8) NOT NULL,
    out_amount_myr numeric(18,2) NOT NULL,
    in_amount_myr numeric(18,2) NOT NULL,
    profit_loss numeric(18,2) DEFAULT 0 NOT NULL,
    remark text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exchange_transactions_sequence_no_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exchange_transactions_sequence_no_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exchange_transactions_sequence_no_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exchange_transactions_sequence_no_seq OWNED BY public.exchange_transactions.sequence_no;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    username text NOT NULL,
    display_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_additions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_additions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    addition_date date DEFAULT CURRENT_DATE NOT NULL,
    description text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    currency public.currency_type DEFAULT 'MYR'::public.currency_type NOT NULL,
    exchange_rate numeric DEFAULT 1 NOT NULL,
    amount_myr numeric DEFAULT 0 NOT NULL,
    is_paid boolean DEFAULT false,
    remark text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    alert_type public.alert_type NOT NULL,
    alert_message text NOT NULL,
    alert_level public.alert_level DEFAULT 'safe'::public.alert_level NOT NULL,
    is_resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    category public.project_expense_category NOT NULL,
    description text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    currency public.currency_type DEFAULT 'MYR'::public.currency_type NOT NULL,
    exchange_rate numeric DEFAULT 1 NOT NULL,
    amount_myr numeric DEFAULT 0 NOT NULL,
    account_type public.account_type DEFAULT 'bank'::public.account_type NOT NULL,
    receipt_url text,
    remark text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category_v2 public.project_expense_category_v2
);


--
-- Name: project_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    payment_stage public.payment_stage NOT NULL,
    amount numeric(18,2) NOT NULL,
    currency public.currency_type NOT NULL,
    account_type public.account_type NOT NULL,
    exchange_rate numeric(12,8) DEFAULT 1 NOT NULL,
    amount_myr numeric(18,2) NOT NULL,
    payment_date date NOT NULL,
    receipt_url text,
    remark text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_code text NOT NULL,
    project_name text NOT NULL,
    customer_name text NOT NULL,
    customer_phone text,
    customer_address text,
    customer_nationality text,
    customer_gender text,
    customer_age integer,
    contract_currency public.currency_type DEFAULT 'MYR'::public.currency_type NOT NULL,
    contract_amount numeric(18,2) NOT NULL,
    contract_amount_myr numeric(18,2) NOT NULL,
    exchange_rate_at_sign numeric(12,8) DEFAULT 1 NOT NULL,
    referrer_name text,
    referrer_commission_rate numeric(5,2) DEFAULT 0,
    referrer_commission_amount numeric(18,2) DEFAULT 0,
    referrer_paid boolean DEFAULT false,
    project_manager text,
    sign_date date NOT NULL,
    delivery_date date,
    actual_delivery_date date,
    warranty_end_date date,
    final_payment_date date,
    status public.project_status DEFAULT 'in_progress'::public.project_status NOT NULL,
    total_income_myr numeric(18,2) DEFAULT 0,
    total_expense_myr numeric(18,2) DEFAULT 0,
    labor_cost_myr numeric(18,2) DEFAULT 0,
    meal_cost_myr numeric(18,2) DEFAULT 0,
    mistake_loss_myr numeric(18,2) DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_addition_myr numeric DEFAULT 0,
    total_material_myr numeric DEFAULT 0,
    total_labor_myr numeric DEFAULT 0,
    total_other_expense_myr numeric DEFAULT 0,
    net_profit_myr numeric DEFAULT 0
);


--
-- Name: transaction_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transaction_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type public.transaction_type NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sequence_no integer NOT NULL,
    transaction_date date NOT NULL,
    category_id uuid,
    category_name text NOT NULL,
    summary text NOT NULL,
    type public.transaction_type NOT NULL,
    amount numeric(18,2) NOT NULL,
    currency public.currency_type NOT NULL,
    account_type public.account_type NOT NULL,
    exchange_rate numeric(12,8) DEFAULT 1 NOT NULL,
    amount_myr numeric(18,2) NOT NULL,
    project_id uuid,
    receipt_url_1 text,
    receipt_url_2 text,
    remark_1 text,
    remark_2 text,
    ledger_type public.ledger_type DEFAULT 'company_daily'::public.ledger_type NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transactions_sequence_no_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_sequence_no_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_sequence_no_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_sequence_no_seq OWNED BY public.transactions.sequence_no;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'viewer'::public.app_role NOT NULL
);


--
-- Name: exchange_transactions sequence_no; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_transactions ALTER COLUMN sequence_no SET DEFAULT nextval('public.exchange_transactions_sequence_no_seq'::regclass);


--
-- Name: transactions sequence_no; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN sequence_no SET DEFAULT nextval('public.transactions_sequence_no_seq'::regclass);


--
-- Name: alert_rules alert_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_rules
    ADD CONSTRAINT alert_rules_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: company_accounts company_accounts_currency_account_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_accounts
    ADD CONSTRAINT company_accounts_currency_account_type_key UNIQUE (currency, account_type);


--
-- Name: company_accounts company_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_accounts
    ADD CONSTRAINT company_accounts_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_from_currency_to_currency_rate_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_from_currency_to_currency_rate_date_key UNIQUE (from_currency, to_currency, rate_date);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: exchange_transactions exchange_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_transactions
    ADD CONSTRAINT exchange_transactions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: project_additions project_additions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_additions
    ADD CONSTRAINT project_additions_pkey PRIMARY KEY (id);


--
-- Name: project_alerts project_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_alerts
    ADD CONSTRAINT project_alerts_pkey PRIMARY KEY (id);


--
-- Name: project_expenses project_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_expenses
    ADD CONSTRAINT project_expenses_pkey PRIMARY KEY (id);


--
-- Name: project_payments project_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_payments
    ADD CONSTRAINT project_payments_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_project_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_code_key UNIQUE (project_code);


--
-- Name: transaction_categories transaction_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_categories
    ADD CONSTRAINT transaction_categories_name_key UNIQUE (name);


--
-- Name: transaction_categories transaction_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_categories
    ADD CONSTRAINT transaction_categories_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_record_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_record_id ON public.audit_logs USING btree (record_id);


--
-- Name: idx_audit_logs_table_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_table_name ON public.audit_logs USING btree (table_name);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_project_additions_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_additions_project_id ON public.project_additions USING btree (project_id);


--
-- Name: idx_project_expenses_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_expenses_category ON public.project_expenses USING btree (category);


--
-- Name: idx_project_expenses_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_expenses_project_id ON public.project_expenses USING btree (project_id);


--
-- Name: exchange_transactions audit_exchange_transactions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_exchange_transactions AFTER INSERT OR DELETE OR UPDATE ON public.exchange_transactions FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();


--
-- Name: project_additions audit_project_additions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_project_additions AFTER INSERT OR DELETE OR UPDATE ON public.project_additions FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();


--
-- Name: project_expenses audit_project_expenses; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_project_expenses AFTER INSERT OR DELETE OR UPDATE ON public.project_expenses FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();


--
-- Name: project_payments audit_project_payments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_project_payments AFTER INSERT OR DELETE OR UPDATE ON public.project_payments FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();


--
-- Name: projects audit_projects; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_projects AFTER INSERT OR DELETE OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();


--
-- Name: transactions audit_transactions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_transactions AFTER INSERT OR DELETE OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();


--
-- Name: profiles on_profile_created_assign_role; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created_assign_role AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_assign_first_admin();


--
-- Name: exchange_transactions sync_exchange_transaction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_exchange_transaction AFTER INSERT OR DELETE OR UPDATE ON public.exchange_transactions FOR EACH ROW EXECUTE FUNCTION public.sync_exchange_to_transactions();


--
-- Name: project_expenses sync_expense_to_transaction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_expense_to_transaction AFTER INSERT OR DELETE OR UPDATE ON public.project_expenses FOR EACH ROW EXECUTE FUNCTION public.sync_project_expense_to_transaction();


--
-- Name: project_payments sync_payment_to_transaction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_payment_to_transaction AFTER INSERT OR DELETE OR UPDATE ON public.project_payments FOR EACH ROW EXECUTE FUNCTION public.sync_project_payment_to_transaction();


--
-- Name: transactions sync_transaction_to_project; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_transaction_to_project AFTER INSERT OR DELETE OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.sync_transaction_to_project();


--
-- Name: projects trigger_check_project_alerts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_check_project_alerts AFTER INSERT OR UPDATE ON public.projects FOR EACH STATEMENT EXECUTE FUNCTION public.check_project_alerts();


--
-- Name: company_accounts update_company_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_accounts_updated_at BEFORE UPDATE ON public.company_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_additions update_project_additions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_additions_updated_at BEFORE UPDATE ON public.project_additions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_expenses update_project_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_expenses_updated_at BEFORE UPDATE ON public.project_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_additions update_project_financials_on_addition; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_financials_on_addition AFTER INSERT OR DELETE OR UPDATE ON public.project_additions FOR EACH ROW EXECUTE FUNCTION public.update_project_additions_summary();


--
-- Name: project_expenses update_project_financials_on_expense; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_financials_on_expense AFTER INSERT OR DELETE OR UPDATE ON public.project_expenses FOR EACH ROW EXECUTE FUNCTION public.update_project_financials();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: exchange_rates exchange_rates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: exchange_transactions exchange_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_transactions
    ADD CONSTRAINT exchange_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_additions project_additions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_additions
    ADD CONSTRAINT project_additions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_alerts project_alerts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_alerts
    ADD CONSTRAINT project_alerts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_expenses project_expenses_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_expenses
    ADD CONSTRAINT project_expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_payments project_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_payments
    ADD CONSTRAINT project_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: project_payments project_payments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_payments
    ADD CONSTRAINT project_payments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: transactions transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.transaction_categories(id);


--
-- Name: transactions transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: transactions transactions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_additions Admin and accountant can delete project additions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin and accountant can delete project additions" ON public.project_additions FOR DELETE USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: project_expenses Admin and accountant can delete project expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin and accountant can delete project expenses" ON public.project_expenses FOR DELETE USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: project_additions Admin and accountant can insert project additions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin and accountant can insert project additions" ON public.project_additions FOR INSERT WITH CHECK (public.is_admin_or_accountant(auth.uid()));


--
-- Name: project_expenses Admin and accountant can insert project expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin and accountant can insert project expenses" ON public.project_expenses FOR INSERT WITH CHECK (public.is_admin_or_accountant(auth.uid()));


--
-- Name: project_additions Admin and accountant can update project additions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin and accountant can update project additions" ON public.project_additions FOR UPDATE USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: project_expenses Admin and accountant can update project expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin and accountant can update project expenses" ON public.project_expenses FOR UPDATE USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: company_accounts Admin and accountant can view company accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin and accountant can view company accounts" ON public.company_accounts FOR SELECT USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: exchange_transactions Admin and accountant can view exchange transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin and accountant can view exchange transactions" ON public.exchange_transactions FOR SELECT USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: project_payments Admin and accountant can view project payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin and accountant can view project payments" ON public.project_payments FOR SELECT USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: transactions Admin and accountant can view transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin and accountant can view transactions" ON public.transactions FOR SELECT USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: alert_rules Admin can manage alert rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage alert rules" ON public.alert_rules TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: transaction_categories Admin can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage categories" ON public.transaction_categories TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_logs Admin can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: company_accounts Admin or accountant can manage company accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin or accountant can manage company accounts" ON public.company_accounts TO authenticated USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: exchange_rates Admin or accountant can manage exchange rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin or accountant can manage exchange rates" ON public.exchange_rates TO authenticated USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: exchange_transactions Admin or accountant can manage exchange transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin or accountant can manage exchange transactions" ON public.exchange_transactions TO authenticated USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: project_alerts Admin or accountant can manage project alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin or accountant can manage project alerts" ON public.project_alerts TO authenticated USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: project_payments Admin or accountant can manage project payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin or accountant can manage project payments" ON public.project_payments TO authenticated USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: projects Admin or accountant can manage projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin or accountant can manage projects" ON public.projects TO authenticated USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: transactions Admin or accountant can manage transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin or accountant can manage transactions" ON public.transactions TO authenticated USING (public.is_admin_or_accountant(auth.uid()));


--
-- Name: audit_logs Admins can update audit logs for restore; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update audit logs for restore" ON public.audit_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_logs Admins can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: alert_rules Authenticated users can view alert rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view alert rules" ON public.alert_rules FOR SELECT TO authenticated USING (true);


--
-- Name: transaction_categories Authenticated users can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view categories" ON public.transaction_categories FOR SELECT TO authenticated USING (true);


--
-- Name: exchange_rates Authenticated users can view exchange rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view exchange rates" ON public.exchange_rates FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Authenticated users can view profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: project_alerts Authenticated users can view project alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view project alerts" ON public.project_alerts FOR SELECT TO authenticated USING (true);


--
-- Name: projects Authenticated users can view projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view projects" ON public.projects FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: user_roles Only admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_logs Trigger can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Trigger can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) OR (user_id IS NULL)));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: project_additions Users can view project additions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view project additions" ON public.project_additions FOR SELECT USING (true);


--
-- Name: project_expenses Users can view project expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view project expenses" ON public.project_expenses FOR SELECT USING (true);


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: alert_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: company_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_additions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_additions ENABLE ROW LEVEL SECURITY;

--
-- Name: project_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: project_expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: project_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;
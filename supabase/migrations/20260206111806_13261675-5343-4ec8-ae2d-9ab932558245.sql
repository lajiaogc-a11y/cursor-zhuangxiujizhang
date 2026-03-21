-- Create employee status enum
CREATE TYPE public.employee_status AS ENUM ('active', 'inactive');

-- Create employees table
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text,
  phone text,
  monthly_salary numeric NOT NULL DEFAULT 0,
  status employee_status NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create salary_advances table
CREATE TABLE public.salary_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  advance_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  currency currency_type NOT NULL DEFAULT 'MYR',
  account_type account_type NOT NULL DEFAULT 'cash',
  exchange_rate numeric NOT NULL DEFAULT 1,
  amount_myr numeric NOT NULL DEFAULT 0,
  is_deducted boolean NOT NULL DEFAULT false,
  deducted_in_payment_id uuid,
  remark text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create salary_payments table
CREATE TABLE public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_month text NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  overtime_pay numeric NOT NULL DEFAULT 0,
  gross_salary numeric NOT NULL DEFAULT 0,
  advance_deduction numeric NOT NULL DEFAULT 0,
  insurance_deduction numeric NOT NULL DEFAULT 0,
  other_deduction numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  currency currency_type NOT NULL DEFAULT 'MYR',
  account_type account_type NOT NULL DEFAULT 'bank',
  exchange_rate numeric NOT NULL DEFAULT 1,
  amount_myr numeric NOT NULL DEFAULT 0,
  remark text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add foreign key for deducted_in_payment_id
ALTER TABLE public.salary_advances 
ADD CONSTRAINT salary_advances_deducted_in_payment_id_fkey 
FOREIGN KEY (deducted_in_payment_id) REFERENCES public.salary_payments(id) ON DELETE SET NULL;

-- Create insurance_payments table
CREATE TABLE public.insurance_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_month text NOT NULL,
  insurance_type text NOT NULL,
  company_contribution numeric NOT NULL DEFAULT 0,
  employee_contribution numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  currency currency_type NOT NULL DEFAULT 'MYR',
  account_type account_type NOT NULL DEFAULT 'bank',
  amount_myr numeric NOT NULL DEFAULT 0,
  remark text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Admin and accountant can manage employees"
ON public.employees FOR ALL
USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Authenticated users can view employees"
ON public.employees FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for salary_advances
CREATE POLICY "Admin and accountant can manage salary advances"
ON public.salary_advances FOR ALL
USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Authenticated users can view salary advances"
ON public.salary_advances FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for salary_payments
CREATE POLICY "Admin and accountant can manage salary payments"
ON public.salary_payments FOR ALL
USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Authenticated users can view salary payments"
ON public.salary_payments FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for insurance_payments
CREATE POLICY "Admin and accountant can manage insurance payments"
ON public.insurance_payments FOR ALL
USING (is_admin_or_accountant(auth.uid()));

CREATE POLICY "Authenticated users can view insurance payments"
ON public.insurance_payments FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger function to sync salary advance to transactions
CREATE OR REPLACE FUNCTION public.sync_salary_advance_to_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
BEGIN
  SELECT name INTO emp_name FROM public.employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_name,
      summary, amount, currency, account_type,
      exchange_rate, amount_myr, remark_1, remark_2, created_by
    ) VALUES (
      NEW.advance_date, 'expense', 'company_daily', '工资预支',
      '员工预支 - ' || COALESCE(emp_name, ''),
      NEW.amount, NEW.currency, NEW.account_type,
      NEW.exchange_rate, NEW.amount_myr, '工资账单', NEW.remark, NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions SET
      transaction_date = NEW.advance_date,
      summary = '员工预支 - ' || COALESCE(emp_name, ''),
      amount = NEW.amount,
      currency = NEW.currency,
      account_type = NEW.account_type,
      exchange_rate = NEW.exchange_rate,
      amount_myr = NEW.amount_myr,
      remark_2 = NEW.remark
    WHERE remark_1 = '工资账单'
      AND category_name = '工资预支'
      AND transaction_date = OLD.advance_date
      AND summary LIKE '%' || (SELECT name FROM public.employees WHERE id = OLD.employee_id) || '%';
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions 
    WHERE remark_1 = '工资账单'
      AND category_name = '工资预支'
      AND transaction_date = OLD.advance_date
      AND summary LIKE '%' || emp_name || '%';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function to sync salary payment to transactions
CREATE OR REPLACE FUNCTION public.sync_salary_payment_to_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
BEGIN
  SELECT name INTO emp_name FROM public.employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_name,
      summary, amount, currency, account_type,
      exchange_rate, amount_myr, remark_1, remark_2, created_by
    ) VALUES (
      NEW.payment_date, 'expense', 'company_daily', '工资发放',
      NEW.payment_month || ' 工资 - ' || COALESCE(emp_name, ''),
      NEW.net_salary, NEW.currency, NEW.account_type,
      NEW.exchange_rate, NEW.amount_myr, '工资账单', NEW.remark, NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions SET
      transaction_date = NEW.payment_date,
      summary = NEW.payment_month || ' 工资 - ' || COALESCE(emp_name, ''),
      amount = NEW.net_salary,
      currency = NEW.currency,
      account_type = NEW.account_type,
      exchange_rate = NEW.exchange_rate,
      amount_myr = NEW.amount_myr,
      remark_2 = NEW.remark
    WHERE remark_1 = '工资账单'
      AND category_name = '工资发放'
      AND transaction_date = OLD.payment_date
      AND summary LIKE OLD.payment_month || '%';
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions 
    WHERE remark_1 = '工资账单'
      AND category_name = '工资发放'
      AND transaction_date = OLD.payment_date
      AND summary LIKE OLD.payment_month || '%' || emp_name || '%';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function to sync insurance payment to transactions
CREATE OR REPLACE FUNCTION public.sync_insurance_payment_to_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
BEGIN
  SELECT name INTO emp_name FROM public.employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_name,
      summary, amount, currency, account_type,
      exchange_rate, amount_myr, remark_1, remark_2, created_by
    ) VALUES (
      NEW.payment_date, 'expense', 'company_daily', '保险缴纳',
      NEW.payment_month || ' ' || NEW.insurance_type || ' - ' || COALESCE(emp_name, ''),
      NEW.total_amount, NEW.currency, NEW.account_type,
      1, NEW.amount_myr, '工资账单', NEW.remark, NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions SET
      transaction_date = NEW.payment_date,
      summary = NEW.payment_month || ' ' || NEW.insurance_type || ' - ' || COALESCE(emp_name, ''),
      amount = NEW.total_amount,
      currency = NEW.currency,
      account_type = NEW.account_type,
      amount_myr = NEW.amount_myr,
      remark_2 = NEW.remark
    WHERE remark_1 = '工资账单'
      AND category_name = '保险缴纳'
      AND transaction_date = OLD.payment_date
      AND summary LIKE OLD.payment_month || '%' || OLD.insurance_type || '%';
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions 
    WHERE remark_1 = '工资账单'
      AND category_name = '保险缴纳'
      AND transaction_date = OLD.payment_date
      AND summary LIKE OLD.payment_month || '%' || OLD.insurance_type || '%' || emp_name || '%';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
CREATE TRIGGER sync_salary_advance_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.salary_advances
FOR EACH ROW EXECUTE FUNCTION public.sync_salary_advance_to_transaction();

CREATE TRIGGER sync_salary_payment_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.salary_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_salary_payment_to_transaction();

CREATE TRIGGER sync_insurance_payment_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.insurance_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_insurance_payment_to_transaction();

-- Add audit log triggers
CREATE TRIGGER audit_employees
AFTER INSERT OR UPDATE OR DELETE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

CREATE TRIGGER audit_salary_advances
AFTER INSERT OR UPDATE OR DELETE ON public.salary_advances
FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

CREATE TRIGGER audit_salary_payments
AFTER INSERT OR UPDATE OR DELETE ON public.salary_payments
FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

CREATE TRIGGER audit_insurance_payments
AFTER INSERT OR UPDATE OR DELETE ON public.insurance_payments
FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
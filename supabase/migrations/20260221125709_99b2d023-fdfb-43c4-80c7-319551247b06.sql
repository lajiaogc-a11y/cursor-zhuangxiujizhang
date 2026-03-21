
-- 1. Add record_type column to payables table
ALTER TABLE public.payables ADD COLUMN record_type TEXT NOT NULL DEFAULT 'payable';

-- 2. Update the audit log function to include new display name
-- (Already handles 'payables' → '应付账款', we'll keep it as-is since it covers both)

-- 3. Update sync_payable_payment_to_transaction to handle receivables
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

  -- Determine transaction type and category based on record_type
  IF payable_record_type = 'receivable' THEN
    txn_type := 'income';
    txn_category := '待收账款';
    txn_summary_suffix := ' 收款';
  ELSE
    txn_type := 'expense';
    txn_category := '应付账款';
    txn_summary_suffix := ' 付款';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (
      transaction_date, type, ledger_type, category_name,
      summary, amount, currency, account_type,
      exchange_rate, amount_myr, remark_1, remark_2, created_by
    ) VALUES (
      NEW.payment_date, txn_type::transaction_type, 'company_daily', txn_category,
      COALESCE(supplier, '') || txn_summary_suffix,
      NEW.amount, NEW.currency, NEW.account_type,
      NEW.exchange_rate, NEW.amount_myr, txn_category, NEW.remark, NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Try to update matching transaction (check both old categories)
    UPDATE public.transactions SET
      transaction_date = NEW.payment_date,
      type = txn_type::transaction_type,
      category_name = txn_category,
      summary = COALESCE(supplier, '') || txn_summary_suffix,
      amount = NEW.amount,
      currency = NEW.currency,
      account_type = NEW.account_type,
      exchange_rate = NEW.exchange_rate,
      amount_myr = NEW.amount_myr,
      remark_2 = NEW.remark
    WHERE remark_1 IN ('应付账款', '待收账款')
      AND category_name IN ('应付账款', '待收账款')
      AND transaction_date = OLD.payment_date
      AND amount = OLD.amount
      AND created_by = OLD.created_by;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions
    WHERE remark_1 IN ('应付账款', '待收账款')
      AND category_name IN ('应付账款', '待收账款')
      AND transaction_date = OLD.payment_date
      AND amount = OLD.amount
      AND created_by = OLD.created_by;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. 创建只读访问函数，允许 project_manager 和 shareholder 查看预警数据
CREATE OR REPLACE FUNCTION public.can_view_alerts(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'accountant', 'project_manager', 'shareholder')
  )
$$;

-- 3. 更新 project_alerts 表的 RLS 策略，允许 project_manager 和 shareholder 查看
DROP POLICY IF EXISTS "Authenticated users can view project alerts" ON public.project_alerts;

CREATE POLICY "Users with view permission can view project alerts"
ON public.project_alerts
FOR SELECT
USING (public.can_view_alerts(auth.uid()));

-- 4. 更新 alert_rules 表的 RLS 策略，允许更多角色查看
DROP POLICY IF EXISTS "Authenticated users can view alert rules" ON public.alert_rules;

CREATE POLICY "Users with view permission can view alert rules"
ON public.alert_rules
FOR SELECT
USING (public.can_view_alerts(auth.uid()));

-- 5. 为余额不足预警添加账户相关字段到 alert_rules 表
ALTER TABLE public.alert_rules 
ADD COLUMN IF NOT EXISTS account_currency text,
ADD COLUMN IF NOT EXISTS account_type text;

-- 添加注释说明字段用途
COMMENT ON COLUMN public.alert_rules.account_currency IS '余额不足预警时指定的货币类型: MYR, CNY, USD';
COMMENT ON COLUMN public.alert_rules.account_type IS '余额不足预警时指定的账户类型: cash, bank';
COMMENT ON COLUMN public.alert_rules.threshold_value IS '利润率预警填百分比数值，余额预警填金额数值';
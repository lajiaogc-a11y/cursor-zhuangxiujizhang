-- 创建薪资设置表
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_payroll_setting UNIQUE (setting_type, setting_key)
);

-- 启用 RLS
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

-- RLS 策略：已认证用户可查看
CREATE POLICY "Authenticated users can view payroll settings"
  ON public.payroll_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS 策略：管理员和会计可管理
CREATE POLICY "Admin and accountant can manage payroll settings"
  ON public.payroll_settings FOR ALL
  USING (is_admin_or_accountant(auth.uid()));

-- 初始化默认设置
INSERT INTO public.payroll_settings (setting_type, setting_key, setting_value) VALUES
  ('insurance', 'employee_rate', '{"percent": 11}'),
  ('insurance', 'company_rate', '{"percent": 13}'),
  ('attendance', 'full_bonus', '{"amount": 200, "required_days": 22}'),
  ('bonus_pool', 'pool_total', '{"amount": 0}')
ON CONFLICT (setting_type, setting_key) DO NOTHING;
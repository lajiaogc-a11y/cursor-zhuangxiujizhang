-- 创建员工职位表
CREATE TABLE IF NOT EXISTS public.employee_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_position_name UNIQUE (name)
);

-- 启用 RLS
ALTER TABLE public.employee_positions ENABLE ROW LEVEL SECURITY;

-- RLS 策略：已认证用户可查看
CREATE POLICY "Authenticated users can view positions"
  ON public.employee_positions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS 策略：管理员和会计可管理
CREATE POLICY "Admin and accountant can manage positions"
  ON public.employee_positions FOR ALL
  USING (is_admin_or_accountant(auth.uid()));

-- 为 salary_payments 添加新字段
ALTER TABLE public.salary_payments
  ADD COLUMN IF NOT EXISTS full_attendance_bonus NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;

-- 初始化一些默认职位
INSERT INTO public.employee_positions (name) VALUES
  ('项目经理'),
  ('工程师'),
  ('设计师'),
  ('销售'),
  ('行政')
ON CONFLICT (name) DO NOTHING;
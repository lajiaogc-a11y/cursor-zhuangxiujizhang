-- 创建项目分类表
CREATE TABLE public.project_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type public.transaction_type NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 启用 RLS
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;

-- RLS 策略：所有认证用户可查看
CREATE POLICY "Authenticated users can view project categories"
ON public.project_categories
FOR SELECT
TO authenticated
USING (true);

-- RLS 策略：管理员可管理
CREATE POLICY "Admin can manage project categories"
ON public.project_categories
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 插入默认项目收入分类
INSERT INTO public.project_categories (name, type, description) VALUES
('工程款收入', 'income', '项目工程款收入'),
('增项收入', 'income', '项目增项收款'),
('其他收入', 'income', '项目其他收入');

-- 插入默认项目支出分类
INSERT INTO public.project_categories (name, type, description) VALUES
('材料费', 'expense', '项目材料采购支出'),
('人工费', 'expense', '项目人工费用'),
('外包费', 'expense', '项目外包服务费用'),
('运输费', 'expense', '项目运输物流费用'),
('管理费', 'expense', '项目管理相关费用'),
('其他支出', 'expense', '项目其他支出');
-- 移除 category_id 外键约束，允许跨表分类
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
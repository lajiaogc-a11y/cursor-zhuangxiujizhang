-- 步骤1: 添加新角色 'shareholder' 到 app_role 枚举
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'shareholder';
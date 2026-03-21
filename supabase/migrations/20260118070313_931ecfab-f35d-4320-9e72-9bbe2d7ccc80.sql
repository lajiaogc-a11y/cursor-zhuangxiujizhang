-- =====================================================
-- 数据库清理迁移：统一用户初始化逻辑
-- 保留唯一的 handle_new_user_complete 作为单一真相来源
-- =====================================================

-- 1. 删除所有可能存在的冗余触发器
DROP TRIGGER IF EXISTS on_first_user_created ON auth.users;
DROP TRIGGER IF EXISTS assign_first_user_admin ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- 2. 删除所有冗余的触发器函数
DROP FUNCTION IF EXISTS public.assign_first_user_as_admin() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_role() CASCADE;

-- 3. 确保 on_auth_user_created 触发器存在且绑定到正确的函数
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_complete();

-- 4. 验证并确保 handle_new_user_complete 函数是幂等且安全的
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
DECLARE
  role_count INTEGER;
BEGIN
  -- 1. 创建用户 profile（使用 ON CONFLICT 确保幂等）
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- 2. 检查是否已有任何角色记录（决定是否为首个用户）
  SELECT COUNT(*) INTO role_count FROM public.user_roles;
  
  -- 3. 分配角色（首用户=admin，其他=viewer）
  -- 使用 ON CONFLICT 确保幂等，不会重复插入
  IF role_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'viewer')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. 添加注释说明此函数的用途
COMMENT ON FUNCTION public.handle_new_user_complete() IS 
'统一的用户初始化函数。在 auth.users 插入后触发。
- 自动创建 profiles 记录
- 首个用户自动成为 admin
- 后续用户默认为 viewer
- 使用 ON CONFLICT 确保幂等性
- 适用于冷启动和账户迁移场景';
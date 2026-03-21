-- 1. 创建统一的用户注册处理函数
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
DECLARE
  role_count INTEGER;
BEGIN
  -- 1. 创建用户 profile
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- 2. 检查是否有任何角色记录
  SELECT COUNT(*) INTO role_count FROM public.user_roles;
  
  -- 3. 第一个用户成为管理员，其他用户成为viewer
  IF role_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'viewer')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. 删除可能存在的所有旧触发器
DROP TRIGGER IF EXISTS on_first_user_created ON auth.users;
DROP TRIGGER IF EXISTS assign_first_user_admin ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- 3. 创建新的统一触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_complete();

-- 4. 为缺失profile的用户创建profile
INSERT INTO public.profiles (user_id, username, display_name)
SELECT id, split_part(email, '@', 1), COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;

-- 5. 为缺失角色的用户分配viewer角色
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'viewer'
FROM public.profiles
WHERE user_id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT DO NOTHING;

-- 6. 如果没有任何管理员，将第一个用户设为管理员
DO $$
DECLARE
  admin_exists BOOLEAN;
  first_user_id UUID;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;
  IF NOT admin_exists THEN
    SELECT user_id INTO first_user_id FROM public.profiles ORDER BY created_at LIMIT 1;
    IF first_user_id IS NOT NULL THEN
      UPDATE public.user_roles SET role = 'admin' WHERE user_id = first_user_id;
    END IF;
  END IF;
END $$;
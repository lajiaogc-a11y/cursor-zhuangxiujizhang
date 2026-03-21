-- 为 profiles 表添加 email 字段以供管理员查看用户邮箱
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 创建触发器函数来同步 auth.users 的 email 到 profiles
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 更新 handle_new_user_complete 函数以包含 email
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 同步现有用户的 email（使用 admin 函数）
-- 由于无法直接访问 auth.users，我们需要在应用层处理

-- 更新 project_categories 的 RLS 策略，允许 project_manager 也可以管理
DROP POLICY IF EXISTS "Admin can manage project categories" ON public.project_categories;

CREATE POLICY "Admin and project_manager can manage project categories" 
ON public.project_categories 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'project_manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'project_manager'::app_role)
);
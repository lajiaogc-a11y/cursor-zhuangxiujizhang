
-- First, manually create profile and assign admin role for the first user
-- Get the user from auth.users and create their profile
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Get the first user from auth.users
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Create profile if not exists
    INSERT INTO public.profiles (user_id, username, display_name)
    VALUES (first_user_id, 'lajiaogc@gmail.com', 'Admin')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (first_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Drop old trigger and function if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;
DROP FUNCTION IF EXISTS public.auto_assign_first_admin();

-- Create a better function that creates profile from auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- If first user, assign admin role; otherwise assign viewer role
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'viewer');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

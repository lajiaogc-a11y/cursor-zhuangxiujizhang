-- Create trigger on auth.users to handle new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_complete();

-- Fix existing user: assign admin role since they were first
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.users.id)
ORDER BY created_at ASC
LIMIT 1;

-- Create profile for existing user if missing
INSERT INTO public.profiles (user_id, username, display_name, email)
SELECT 
  id,
  split_part(email, '@', 1),
  split_part(email, '@', 1),
  email
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.users.id);
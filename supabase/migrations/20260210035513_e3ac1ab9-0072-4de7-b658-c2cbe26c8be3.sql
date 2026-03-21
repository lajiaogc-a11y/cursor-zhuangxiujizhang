
-- Create user_permissions table
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_key text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can read own permissions
CREATE POLICY "Users can read own permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage all permissions
CREATE POLICY "Admins can manage all permissions"
  ON public.user_permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Initialize dashboard permission for all existing non-admin users
INSERT INTO public.user_permissions (user_id, permission_key, granted)
SELECT ur.user_id, 'nav.dashboard', true
FROM public.user_roles ur
WHERE ur.role != 'admin'
ON CONFLICT (user_id, permission_key) DO NOTHING;

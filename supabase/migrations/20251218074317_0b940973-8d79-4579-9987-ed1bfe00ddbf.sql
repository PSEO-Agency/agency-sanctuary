-- Create platform_settings table for super admin configuration
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage platform settings
CREATE POLICY "Super admins can manage platform settings"
ON public.platform_settings FOR ALL
USING (user_has_role(auth.uid(), 'super_admin'))
WITH CHECK (user_has_role(auth.uid(), 'super_admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
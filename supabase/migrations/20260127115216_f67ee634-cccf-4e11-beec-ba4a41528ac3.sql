-- Create feature_stages table first (referenced by feature_requests)
CREATE TABLE public.feature_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#e2e8f0',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_stages ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage stages
CREATE POLICY "Super admins can manage stages"
  ON public.feature_stages FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Insert default stages with pastel colors
INSERT INTO public.feature_stages (name, color, position) VALUES
  ('Backlog', '#f1f5f9', 0),
  ('In Progress', '#dbeafe', 1),
  ('Review', '#fef3c7', 2),
  ('Done', '#dcfce7', 3);

-- Create feature_requests table
CREATE TABLE public.feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  stage_id uuid REFERENCES public.feature_stages(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  deadline date,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage features
CREATE POLICY "Super admins can manage features"
  ON public.feature_requests FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Create updated_at trigger
CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
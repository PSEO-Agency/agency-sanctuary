-- Create blog_projects table
CREATE TABLE public.blog_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subaccount_id UUID NOT NULL REFERENCES public.subaccounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  airtable_base_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add project_id to blog_posts
ALTER TABLE public.blog_posts ADD COLUMN project_id UUID REFERENCES public.blog_projects(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.blog_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for blog_projects
CREATE POLICY "Users can view their subaccount projects"
ON public.blog_projects
FOR SELECT
TO authenticated
USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can create projects in their subaccount"
ON public.blog_projects
FOR INSERT
TO authenticated
WITH CHECK (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can update their subaccount projects"
ON public.blog_projects
FOR UPDATE
TO authenticated
USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can delete their subaccount projects"
ON public.blog_projects
FOR DELETE
TO authenticated
USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Agency admins can view their agency projects"
ON public.blog_projects
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM subaccounts
  WHERE subaccounts.id = blog_projects.subaccount_id
  AND subaccounts.agency_id = user_agency_id(auth.uid())
));

CREATE POLICY "Super admins can manage all projects"
ON public.blog_projects
FOR ALL
TO authenticated
USING (user_has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_blog_projects_updated_at
BEFORE UPDATE ON public.blog_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
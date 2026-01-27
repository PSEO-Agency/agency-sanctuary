-- Create project_knowledge_base table for per-project knowledge bases
CREATE TABLE public.project_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.blog_projects(id) ON DELETE CASCADE,
  subaccount_id UUID NOT NULL REFERENCES public.subaccounts(id) ON DELETE CASCADE,
  brand_name TEXT,
  tagline TEXT,
  brand_voice TEXT,
  industry TEXT,
  target_audience TEXT,
  key_differentiators TEXT,
  system_prompt TEXT,
  ai_agent_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE public.project_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their subaccount project knowledge bases"
  ON public.project_knowledge_base FOR SELECT
  USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can create project knowledge bases in their subaccount"
  ON public.project_knowledge_base FOR INSERT
  WITH CHECK (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can update their subaccount project knowledge bases"
  ON public.project_knowledge_base FOR UPDATE
  USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can delete their subaccount project knowledge bases"
  ON public.project_knowledge_base FOR DELETE
  USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Agency admins can view their agency project knowledge bases"
  ON public.project_knowledge_base FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM subaccounts
    WHERE subaccounts.id = project_knowledge_base.subaccount_id
    AND subaccounts.agency_id = user_agency_id(auth.uid())
  ));

CREATE POLICY "Super admins can manage all project knowledge bases"
  ON public.project_knowledge_base FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_project_knowledge_base_updated_at
  BEFORE UPDATE ON public.project_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
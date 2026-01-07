-- Create knowledge base table for brand identity and AI prompts
CREATE TABLE public.subaccount_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subaccount_id UUID NOT NULL REFERENCES public.subaccounts(id) ON DELETE CASCADE UNIQUE,
  brand_name TEXT,
  tagline TEXT,
  brand_voice TEXT,
  industry TEXT,
  target_audience TEXT,
  key_differentiators TEXT,
  system_prompt TEXT,
  ai_agent_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subaccount_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Users can view their subaccount knowledge base
CREATE POLICY "Users can view their subaccount knowledge base"
ON public.subaccount_knowledge_base
FOR SELECT
USING (subaccount_id = user_subaccount_id(auth.uid()));

-- Users can create their subaccount knowledge base
CREATE POLICY "Users can create their subaccount knowledge base"
ON public.subaccount_knowledge_base
FOR INSERT
WITH CHECK (subaccount_id = user_subaccount_id(auth.uid()));

-- Users can update their subaccount knowledge base
CREATE POLICY "Users can update their subaccount knowledge base"
ON public.subaccount_knowledge_base
FOR UPDATE
USING (subaccount_id = user_subaccount_id(auth.uid()));

-- Agency admins can view their agency knowledge bases
CREATE POLICY "Agency admins can view their agency knowledge bases"
ON public.subaccount_knowledge_base
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM subaccounts
  WHERE subaccounts.id = subaccount_knowledge_base.subaccount_id
  AND subaccounts.agency_id = user_agency_id(auth.uid())
));

-- Super admins can manage all knowledge bases
CREATE POLICY "Super admins can manage all knowledge bases"
ON public.subaccount_knowledge_base
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_subaccount_knowledge_base_updated_at
BEFORE UPDATE ON public.subaccount_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
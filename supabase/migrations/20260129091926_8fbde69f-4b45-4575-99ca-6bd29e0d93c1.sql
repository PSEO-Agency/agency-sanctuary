-- Create SEO connections table for DataForSEO and future providers
CREATE TABLE public.seo_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subaccount_id UUID NOT NULL REFERENCES public.subaccounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'dataforseo',
  name TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'connected',
  last_checked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seo_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their subaccount SEO connections"
ON public.seo_connections FOR SELECT
USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can create SEO connections in their subaccount"
ON public.seo_connections FOR INSERT
WITH CHECK (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can update their subaccount SEO connections"
ON public.seo_connections FOR UPDATE
USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can delete their subaccount SEO connections"
ON public.seo_connections FOR DELETE
USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Agency admins can view their agency SEO connections"
ON public.seo_connections FOR SELECT
USING (EXISTS (
  SELECT 1 FROM subaccounts
  WHERE subaccounts.id = seo_connections.subaccount_id
  AND subaccounts.agency_id = user_agency_id(auth.uid())
));

CREATE POLICY "Super admins can manage all SEO connections"
ON public.seo_connections FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add seo_connection_id to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN seo_connection_id UUID REFERENCES public.seo_connections(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_seo_connections_subaccount ON public.seo_connections(subaccount_id);
CREATE INDEX idx_campaigns_seo_connection ON public.campaigns(seo_connection_id);
-- Create campaigns table for pSEO campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subaccount_id UUID NOT NULL REFERENCES public.subaccounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  
  -- Business details
  business_name TEXT,
  website_url TEXT,
  business_address TEXT,
  business_logo_url TEXT,
  business_type TEXT CHECK (business_type IN ('saas', 'ecommerce', 'local')),
  
  -- Data source configuration
  data_source_type TEXT CHECK (data_source_type IN ('csv', 'scratch')),
  data_columns JSONB DEFAULT '[]'::jsonb,
  column_mappings JSONB DEFAULT '{}'::jsonb,
  
  -- Template configuration
  template_id TEXT,
  template_config JSONB DEFAULT '{}'::jsonb,
  
  -- Deployment settings
  deployment_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Statistics
  pages_generated INTEGER DEFAULT 0,
  total_pages INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_pages table for individual generated pages
CREATE TABLE public.campaign_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  subaccount_id UUID NOT NULL REFERENCES public.subaccounts(id) ON DELETE CASCADE,
  
  -- Page content
  title TEXT NOT NULL,
  slug TEXT,
  data_values JSONB DEFAULT '{}'::jsonb,
  
  -- SEO metadata
  meta_title TEXT,
  meta_description TEXT,
  
  -- Content sections
  sections_content JSONB DEFAULT '[]'::jsonb,
  
  -- Keywords
  keywords JSONB DEFAULT '[]'::jsonb,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'reviewed', 'published')),
  published_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaigns (subaccount-scoped)
CREATE POLICY "Users can view campaigns in their subaccount"
ON public.campaigns FOR SELECT
USING (
  subaccount_id IN (
    SELECT context_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND context_type = 'subaccount'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.subaccounts s
    JOIN public.user_roles ur ON ur.context_id = s.agency_id
    WHERE s.id = campaigns.subaccount_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'agency_admin'
  )
);

CREATE POLICY "Users can create campaigns in their subaccount"
ON public.campaigns FOR INSERT
WITH CHECK (
  subaccount_id IN (
    SELECT context_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND context_type = 'subaccount'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.subaccounts s
    JOIN public.user_roles ur ON ur.context_id = s.agency_id
    WHERE s.id = campaigns.subaccount_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'agency_admin'
  )
);

CREATE POLICY "Users can update campaigns in their subaccount"
ON public.campaigns FOR UPDATE
USING (
  subaccount_id IN (
    SELECT context_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND context_type = 'subaccount'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.subaccounts s
    JOIN public.user_roles ur ON ur.context_id = s.agency_id
    WHERE s.id = campaigns.subaccount_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'agency_admin'
  )
);

CREATE POLICY "Users can delete campaigns in their subaccount"
ON public.campaigns FOR DELETE
USING (
  subaccount_id IN (
    SELECT context_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND context_type = 'subaccount'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.subaccounts s
    JOIN public.user_roles ur ON ur.context_id = s.agency_id
    WHERE s.id = campaigns.subaccount_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'agency_admin'
  )
);

-- RLS policies for campaign_pages (subaccount-scoped)
CREATE POLICY "Users can view campaign pages in their subaccount"
ON public.campaign_pages FOR SELECT
USING (
  subaccount_id IN (
    SELECT context_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND context_type = 'subaccount'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.subaccounts s
    JOIN public.user_roles ur ON ur.context_id = s.agency_id
    WHERE s.id = campaign_pages.subaccount_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'agency_admin'
  )
);

CREATE POLICY "Users can create campaign pages in their subaccount"
ON public.campaign_pages FOR INSERT
WITH CHECK (
  subaccount_id IN (
    SELECT context_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND context_type = 'subaccount'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.subaccounts s
    JOIN public.user_roles ur ON ur.context_id = s.agency_id
    WHERE s.id = campaign_pages.subaccount_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'agency_admin'
  )
);

CREATE POLICY "Users can update campaign pages in their subaccount"
ON public.campaign_pages FOR UPDATE
USING (
  subaccount_id IN (
    SELECT context_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND context_type = 'subaccount'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.subaccounts s
    JOIN public.user_roles ur ON ur.context_id = s.agency_id
    WHERE s.id = campaign_pages.subaccount_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'agency_admin'
  )
);

CREATE POLICY "Users can delete campaign pages in their subaccount"
ON public.campaign_pages FOR DELETE
USING (
  subaccount_id IN (
    SELECT context_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND context_type = 'subaccount'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.subaccounts s
    JOIN public.user_roles ur ON ur.context_id = s.agency_id
    WHERE s.id = campaign_pages.subaccount_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'agency_admin'
  )
);

-- Create indexes for performance
CREATE INDEX idx_campaigns_subaccount_id ON public.campaigns(subaccount_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaign_pages_campaign_id ON public.campaign_pages(campaign_id);
CREATE INDEX idx_campaign_pages_subaccount_id ON public.campaign_pages(subaccount_id);
CREATE INDEX idx_campaign_pages_status ON public.campaign_pages(status);

-- Trigger for updated_at on campaigns
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on campaign_pages
CREATE TRIGGER update_campaign_pages_updated_at
BEFORE UPDATE ON public.campaign_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
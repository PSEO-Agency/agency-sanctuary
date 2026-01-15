-- Add preview_token to campaign_pages for public access
ALTER TABLE public.campaign_pages 
ADD COLUMN IF NOT EXISTS preview_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Add preview_settings and static_pages to campaigns for website configuration
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS preview_settings JSONB DEFAULT '{"navbar": {"showLogo": true, "showEntityDropdowns": true}, "footer": {"showCopyright": true}, "theme": {"primaryColor": "#6366f1", "backgroundColor": "#ffffff"}}'::jsonb,
ADD COLUMN IF NOT EXISTS static_pages JSONB DEFAULT '[]'::jsonb;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_campaign_pages_preview_token ON public.campaign_pages(preview_token);

-- Create RLS policy for public preview access via token
CREATE POLICY "Allow public read access via preview token"
ON public.campaign_pages
FOR SELECT
USING (preview_token IS NOT NULL);

-- Allow authenticated users to generate/update preview tokens for their pages
CREATE POLICY "Users can update preview tokens for their campaign pages"
ON public.campaign_pages
FOR UPDATE
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
)
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
);
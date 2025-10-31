-- Create blog_posts table for storing blog content
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subaccount_id UUID NOT NULL REFERENCES public.subaccounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image TEXT,
  categories TEXT[],
  tags TEXT[],
  status TEXT NOT NULL DEFAULT 'draft',
  wordpress_post_id TEXT,
  wordpress_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Policies for blog_posts
CREATE POLICY "Users can view their subaccount blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can create blog posts in their subaccount"
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can update their subaccount blog posts"
  ON public.blog_posts
  FOR UPDATE
  USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can delete their subaccount blog posts"
  ON public.blog_posts
  FOR DELETE
  USING (subaccount_id = user_subaccount_id(auth.uid()));

-- Agency admins can view all blog posts in their agency subaccounts
CREATE POLICY "Agency admins can view their agency blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subaccounts
      WHERE subaccounts.id = blog_posts.subaccount_id
        AND subaccounts.agency_id = user_agency_id(auth.uid())
    )
  );

-- Super admins can manage all blog posts
CREATE POLICY "Super admins can manage all blog posts"
  ON public.blog_posts
  FOR ALL
  USING (user_has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_blog_posts_subaccount ON public.blog_posts(subaccount_id);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);

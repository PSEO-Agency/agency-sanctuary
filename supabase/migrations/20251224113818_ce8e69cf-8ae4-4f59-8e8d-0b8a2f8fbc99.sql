-- Drop and recreate policies for agencies to use has_role instead of user_has_role
DROP POLICY IF EXISTS "Super admins can view all agencies" ON public.agencies;
DROP POLICY IF EXISTS "Super admins can manage agencies" ON public.agencies;

CREATE POLICY "Super admins can view all agencies" 
ON public.agencies 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage agencies" 
ON public.agencies 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Drop and recreate policies for subaccounts
DROP POLICY IF EXISTS "Super admins can view all subaccounts" ON public.subaccounts;
DROP POLICY IF EXISTS "Super admins can manage all subaccounts" ON public.subaccounts;

CREATE POLICY "Super admins can view all subaccounts" 
ON public.subaccounts 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage all subaccounts" 
ON public.subaccounts 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix profiles policies
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix blog_posts policies  
DROP POLICY IF EXISTS "Super admins can manage all blog posts" ON public.blog_posts;

CREATE POLICY "Super admins can manage all blog posts" 
ON public.blog_posts 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix blog_projects policies
DROP POLICY IF EXISTS "Super admins can manage all projects" ON public.blog_projects;

CREATE POLICY "Super admins can manage all projects" 
ON public.blog_projects 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix subscription_plans policies
DROP POLICY IF EXISTS "Super admins can manage subscription plans" ON public.subscription_plans;

CREATE POLICY "Super admins can manage subscription plans" 
ON public.subscription_plans 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix subaccount_subscriptions policies
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON public.subaccount_subscriptions;

CREATE POLICY "Super admins can manage all subscriptions" 
ON public.subaccount_subscriptions 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix platform_settings policies
DROP POLICY IF EXISTS "Super admins can manage platform settings" ON public.platform_settings;

CREATE POLICY "Super admins can manage platform settings" 
ON public.platform_settings 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
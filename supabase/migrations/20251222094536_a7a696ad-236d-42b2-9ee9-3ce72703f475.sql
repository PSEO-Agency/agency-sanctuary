-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) DEFAULT 0,
  article_limit INTEGER NOT NULL,
  can_publish BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read plans
CREATE POLICY "Anyone can view subscription plans"
ON public.subscription_plans
FOR SELECT
USING (true);

-- Only super admins can manage plans
CREATE POLICY "Super admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
USING (user_has_role(auth.uid(), 'super_admin'::app_role));

-- Subaccount subscriptions table
CREATE TABLE public.subaccount_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subaccount_id UUID NOT NULL REFERENCES public.subaccounts(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  articles_used INTEGER DEFAULT 0,
  other_credits INTEGER DEFAULT 5,
  billing_period_start TIMESTAMPTZ DEFAULT now(),
  billing_period_end TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subaccount_id)
);

-- Enable RLS
ALTER TABLE public.subaccount_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their subaccount subscription"
ON public.subaccount_subscriptions
FOR SELECT
USING (subaccount_id = user_subaccount_id(auth.uid()));

-- Agency admins can view their subaccounts' subscriptions
CREATE POLICY "Agency admins can view their agency subscriptions"
ON public.subaccount_subscriptions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM subaccounts
  WHERE subaccounts.id = subaccount_subscriptions.subaccount_id
  AND subaccounts.agency_id = user_agency_id(auth.uid())
));

-- Super admins can manage all subscriptions
CREATE POLICY "Super admins can manage all subscriptions"
ON public.subaccount_subscriptions
FOR ALL
USING (user_has_role(auth.uid(), 'super_admin'::app_role));

-- Users can update their own subscription (for usage tracking)
CREATE POLICY "Users can update their subaccount subscription"
ON public.subaccount_subscriptions
FOR UPDATE
USING (subaccount_id = user_subaccount_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_subaccount_subscriptions_updated_at
BEFORE UPDATE ON public.subaccount_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plans
INSERT INTO public.subscription_plans (name, price_monthly, article_limit, can_publish) VALUES
  ('Basic', 0, 10, false),
  ('Pro', 29, 100, true);
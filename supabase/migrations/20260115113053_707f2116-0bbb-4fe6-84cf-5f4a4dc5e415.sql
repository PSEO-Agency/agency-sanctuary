-- Create atomic function to increment articles_used
CREATE OR REPLACE FUNCTION public.increment_articles_used(p_subaccount_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE subaccount_subscriptions
  SET articles_used = COALESCE(articles_used, 0) + 1,
      updated_at = now()
  WHERE subaccount_id = p_subaccount_id;
END;
$$;

-- Create function to reset usage and align billing period for free/basic users
CREATE OR REPLACE FUNCTION public.reset_articles_if_period_ended(p_subaccount_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE subaccount_subscriptions
  SET 
    articles_used = 0,
    billing_period_start = now(),
    billing_period_end = now() + interval '1 month',
    updated_at = now()
  WHERE subaccount_id = p_subaccount_id
    AND (billing_period_end IS NULL OR billing_period_end < now());
END;
$$;
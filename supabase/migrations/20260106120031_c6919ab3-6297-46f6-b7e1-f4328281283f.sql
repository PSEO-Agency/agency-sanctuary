-- Add trial tracking columns to subaccount_subscriptions
ALTER TABLE public.subaccount_subscriptions
ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_customer_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_method_added boolean DEFAULT false;

-- Add marketing consent columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS marketing_consent_date timestamp with time zone DEFAULT NULL;

-- Create index for trial tracking queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON public.subaccount_subscriptions(trial_ends_at) 
WHERE is_trial = true;

-- Create index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subaccount_subscriptions(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;
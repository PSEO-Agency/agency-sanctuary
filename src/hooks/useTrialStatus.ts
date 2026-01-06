import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrialStatus {
  isTrialing: boolean;
  daysRemaining: number;
  trialEndsAt: Date | null;
  hasPaymentMethod: boolean;
  planName: string;
  articlesUsed: number;
  articleLimit: number;
  isLoading: boolean;
  subscriptionStatus: "none" | "trialing" | "active" | "past_due" | "canceled";
}

export function useTrialStatus(subaccountId: string | undefined) {
  const [status, setStatus] = useState<TrialStatus>({
    isTrialing: false,
    daysRemaining: 0,
    trialEndsAt: null,
    hasPaymentMethod: false,
    planName: "Free",
    articlesUsed: 0,
    articleLimit: 10,
    isLoading: true,
    subscriptionStatus: "none",
  });

  const checkSubscription = useCallback(async () => {
    if (!subaccountId) return;

    try {
      // First check local database
      const { data: subData } = await supabase
        .from("subaccount_subscriptions")
        .select(`
          is_trial,
          trial_ends_at,
          payment_method_added,
          articles_used,
          plan_id,
          subscription_plans (
            name,
            article_limit
          )
        `)
        .eq("subaccount_id", subaccountId)
        .maybeSingle();

      if (subData) {
        const plan = subData.subscription_plans as { name: string; article_limit: number } | null;
        const trialEndsAt = subData.trial_ends_at ? new Date(subData.trial_ends_at) : null;
        const now = new Date();
        const daysRemaining = trialEndsAt 
          ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        setStatus({
          isTrialing: subData.is_trial ?? false,
          daysRemaining,
          trialEndsAt,
          hasPaymentMethod: subData.payment_method_added ?? false,
          planName: plan?.name ?? "Free",
          articlesUsed: subData.articles_used ?? 0,
          articleLimit: plan?.article_limit ?? 10,
          isLoading: false,
          subscriptionStatus: subData.is_trial ? "trialing" : (plan?.name === "Pro" ? "active" : "none"),
        });
      } else {
        setStatus(prev => ({ ...prev, isLoading: false }));
      }

      // Then sync with Stripe in the background
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        body: { subaccountId },
      });

      if (!error && data) {
        const trialEndsAt = data.trialEndsAt ? new Date(data.trialEndsAt) : null;
        const now = new Date();
        const daysRemaining = trialEndsAt 
          ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        // Refetch local data after sync
        const { data: refreshedData } = await supabase
          .from("subaccount_subscriptions")
          .select(`
            is_trial,
            trial_ends_at,
            payment_method_added,
            articles_used,
            plan_id,
            subscription_plans (
              name,
              article_limit
            )
          `)
          .eq("subaccount_id", subaccountId)
          .maybeSingle();

        if (refreshedData) {
          const plan = refreshedData.subscription_plans as { name: string; article_limit: number } | null;
          setStatus({
            isTrialing: data.isTrialing ?? false,
            daysRemaining,
            trialEndsAt,
            hasPaymentMethod: refreshedData.payment_method_added ?? false,
            planName: plan?.name ?? "Free",
            articlesUsed: refreshedData.articles_used ?? 0,
            articleLimit: plan?.article_limit ?? 10,
            isLoading: false,
            subscriptionStatus: data.status || "none",
          });
        }
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [subaccountId]);

  useEffect(() => {
    checkSubscription();

    // Refresh every 60 seconds
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return { ...status, refresh: checkSubscription };
}

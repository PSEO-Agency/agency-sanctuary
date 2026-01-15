import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubaccountUsageData {
  articlesUsedPeriod: number;
  articleLimit: number;
  planName: string;
  billingPeriodEnd: string | null;
  isTrial: boolean;
  trialEndsAt: string | null;
  paymentMethodAdded: boolean;
  totalArticles: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSubaccountUsage = (subaccountId: string | undefined): SubaccountUsageData => {
  const [data, setData] = useState<Omit<SubaccountUsageData, 'refetch'>>({
    articlesUsedPeriod: 0,
    articleLimit: 10,
    planName: 'Basic',
    billingPeriodEnd: null,
    isTrial: false,
    trialEndsAt: null,
    paymentMethodAdded: false,
    totalArticles: 0,
    isLoading: true,
    error: null,
  });

  const fetchUsage = useCallback(async () => {
    if (!subaccountId) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch subscription data with plan info
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subaccount_subscriptions')
        .select(`
          articles_used,
          billing_period_end,
          is_trial,
          trial_ends_at,
          payment_method_added,
          plan_id,
          subscription_plans (
            name,
            article_limit
          )
        `)
        .eq('subaccount_id', subaccountId)
        .maybeSingle();

      if (subscriptionError) {
        throw subscriptionError;
      }

      // Fetch airtable base id for counting total articles
      const { data: subaccountData } = await supabase
        .from('subaccounts')
        .select('airtable_base_id')
        .eq('id', subaccountId)
        .maybeSingle();

      let totalArticles = 0;

      // Fetch total articles from Airtable if base exists
      if (subaccountData?.airtable_base_id) {
        try {
          const { data: articlesResponse } = await supabase.functions.invoke('fetch-airtable-articles', {
            body: { 
              baseId: subaccountData.airtable_base_id,
              countOnly: true
            }
          });
          
          if (articlesResponse?.count !== undefined) {
            totalArticles = articlesResponse.count;
          } else if (articlesResponse?.articles) {
            totalArticles = articlesResponse.articles.length;
          }
        } catch (e) {
          console.warn('Failed to fetch Airtable article count:', e);
        }
      }

      const planInfo = subscriptionData?.subscription_plans as { name: string; article_limit: number } | null;

      setData({
        articlesUsedPeriod: subscriptionData?.articles_used ?? 0,
        articleLimit: planInfo?.article_limit ?? 10,
        planName: planInfo?.name ?? 'Basic',
        billingPeriodEnd: subscriptionData?.billing_period_end ?? null,
        isTrial: subscriptionData?.is_trial ?? false,
        trialEndsAt: subscriptionData?.trial_ends_at ?? null,
        paymentMethodAdded: subscriptionData?.payment_method_added ?? false,
        totalArticles,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error fetching subaccount usage:', err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch usage data',
      }));
    }
  }, [subaccountId]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    ...data,
    refetch: fetchUsage,
  };
};

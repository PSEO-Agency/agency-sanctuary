import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, X, Zap, FileText, Loader2, CreditCard, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Stripe price mapping
const STRIPE_PRICES = {
  pro: "price_1Sh6DdRt14NKHEUMlCqYb7mA", // €495/month Pro Plan
};

interface PlanDetails {
  id: string;
  name: string;
  priceMonthly: number;
  articleLimit: number;
  canPublish: boolean;
}

interface SubscriptionDetails {
  plan: PlanDetails;
  articlesUsed: number;
  otherCredits: number;
  billingPeriodEnd: Date;
  isTrial: boolean;
  trialEndsAt: Date | null;
  hasPaymentMethod: boolean;
  stripeCustomerId: string | null;
}

export default function BillingSettings() {
  const { subaccountId } = useParams();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [plans, setPlans] = useState<PlanDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [managingPortal, setManagingPortal] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Check for success/canceled params
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated successfully!");
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Checkout was canceled");
    } else if (searchParams.get("trial") === "activated") {
      toast.success("Your 7-day free trial has started!");
    }
  }, [subaccountId, searchParams]);

  const fetchData = async () => {
    try {
      // Fetch all plans
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_monthly", { ascending: true });

      if (plansData) {
        setPlans(plansData.map(p => ({
          id: p.id,
          name: p.name,
          priceMonthly: Number(p.price_monthly),
          articleLimit: p.article_limit,
          canPublish: p.can_publish ?? false,
        })));
      }

      // Fetch current subscription with new columns
      const { data: subData } = await supabase
        .from("subaccount_subscriptions")
        .select(`
          articles_used,
          other_credits,
          billing_period_end,
          plan_id,
          is_trial,
          trial_ends_at,
          payment_method_added,
          stripe_customer_id
        `)
        .eq("subaccount_id", subaccountId)
        .maybeSingle();

      if (subData && plansData) {
        const currentPlan = plansData.find(p => p.id === subData.plan_id);
        if (currentPlan) {
          setSubscription({
            plan: {
              id: currentPlan.id,
              name: currentPlan.name,
              priceMonthly: Number(currentPlan.price_monthly),
              articleLimit: currentPlan.article_limit,
              canPublish: currentPlan.can_publish ?? false,
            },
            articlesUsed: subData.articles_used ?? 0,
            otherCredits: subData.other_credits ?? 0,
            billingPeriodEnd: new Date(subData.billing_period_end),
            isTrial: subData.is_trial ?? false,
            trialEndsAt: subData.trial_ends_at ? new Date(subData.trial_ends_at) : null,
            hasPaymentMethod: subData.payment_method_added ?? false,
            stripeCustomerId: subData.stripe_customer_id,
          });
        }
      }

      // Sync with Stripe in background
      if (subaccountId) {
        supabase.functions.invoke("check-subscription", {
          body: { subaccountId },
        }).then(() => {
          // Refetch after sync
          fetchData();
        }).catch(console.error);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-trial-checkout", {
        body: { subaccountId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: unknown) {
      console.error("Error creating trial checkout:", error);
      const message = error instanceof Error ? error.message : "Failed to start trial";
      toast.error(message);
    } finally {
      setUpgrading(false);
    }
  };

  const handleUpgrade = async (plan: PlanDetails) => {
    if (plan.name === "Free") {
      // For downgrading to free, just update the database
      try {
        const { error } = await supabase
          .from("subaccount_subscriptions")
          .update({ 
            plan_id: plan.id,
            is_trial: false,
            trial_ends_at: null,
          })
          .eq("subaccount_id", subaccountId);

        if (error) throw error;
        toast.success("Downgraded to Free plan");
        fetchData();
      } catch (error) {
        console.error("Error downgrading:", error);
        toast.error("Failed to downgrade plan");
      }
      return;
    }

    // For Pro plan, redirect to trial checkout
    await handleStartTrial();
  };

  const handleManageSubscription = async () => {
    setManagingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { subaccountId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error: unknown) {
      console.error("Error opening portal:", error);
      const message = error instanceof Error ? error.message : "Failed to open billing portal";
      toast.error(message);
    } finally {
      setManagingPortal(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Billing</h2>
          <p className="text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }

  const usagePercentage = subscription 
    ? (subscription.articlesUsed / subscription.plan.articleLimit) * 100 
    : 0;

  const trialDaysRemaining = subscription?.trialEndsAt 
    ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Billing</h2>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Trial Status Banner */}
      {subscription?.isTrial && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Free Trial Active</h3>
                  <p className="text-muted-foreground">
                    {trialDaysRemaining} {trialDaysRemaining === 1 ? "day" : "days"} remaining
                    {subscription.trialEndsAt && ` • Ends ${subscription.trialEndsAt.toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <Progress 
                value={(trialDaysRemaining / 7) * 100} 
                className={cn(
                  "w-24 h-2",
                  trialDaysRemaining >= 5 ? "[&>div]:bg-success" :
                  trialDaysRemaining >= 2 ? "[&>div]:bg-warning" :
                  "[&>div]:bg-destructive"
                )}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan Card */}
      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {subscription.plan.name} Plan
                    {subscription.isTrial && (
                      <span className="ml-2 text-xs font-normal px-2 py-1 bg-warning/10 text-warning rounded-full">
                        Trial
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {subscription.plan.priceMonthly === 0 
                      ? "Free" 
                      : `€${subscription.plan.priceMonthly}/month`}
                  </CardDescription>
                </div>
              </div>
              {subscription.hasPaymentMethod && (
                <Button 
                  variant="outline" 
                  onClick={handleManageSubscription}
                  disabled={managingPortal}
                >
                  {managingPortal ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Manage Subscription
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Usage Stats */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Articles Used This Month</span>
                <span className="font-medium">
                  {subscription.articlesUsed} / {subscription.plan.articleLimit}
                </span>
              </div>
              <Progress 
                value={usagePercentage} 
                className={cn(
                  "h-2",
                  usagePercentage >= 90 ? "[&>div]:bg-destructive" :
                  usagePercentage >= 75 ? "[&>div]:bg-warning" :
                  "[&>div]:bg-primary"
                )}
              />
              {usagePercentage >= 80 && (
                <p className="text-xs text-warning">
                  You're approaching your article limit. Consider upgrading for more articles.
                </p>
              )}
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Other Credits</span>
              <span className="font-medium">{subscription.otherCredits} remaining</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {subscription.isTrial ? "Trial Ends" : "Billing Period Ends"}
              </span>
              <span className="font-medium">
                {subscription.isTrial && subscription.trialEndsAt
                  ? subscription.trialEndsAt.toLocaleDateString()
                  : subscription.billingPeriodEnd.toLocaleDateString()}
              </span>
            </div>

            {/* Payment Method Status */}
            {!subscription.hasPaymentMethod && subscription.plan.name !== "Free" && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  No payment method on file
                </span>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="ml-auto"
                  onClick={handleStartTrial}
                  disabled={upgrading}
                >
                  Add Payment Method
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Compare Plans</CardTitle>
          <CardDescription>Choose the plan that's right for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.plan.id === plan.id;
              const isUpgrade = subscription && plan.priceMonthly > subscription.plan.priceMonthly;
              const showTrialButton = !subscription?.hasPaymentMethod && plan.name === "Pro";

              return (
                <div 
                  key={plan.id}
                  className={cn(
                    "relative border rounded-lg p-5",
                    isCurrentPlan 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                      Current Plan
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-2xl font-bold">
                      {plan.priceMonthly === 0 ? "Free" : `€${plan.priceMonthly}`}
                      {plan.priceMonthly > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">/month</span>
                      )}
                    </p>
                    {plan.name === "Pro" && !subscription?.hasPaymentMethod && (
                      <p className="text-sm text-success font-medium mt-1">
                        Start with 7-day free trial
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 mb-5">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>{plan.articleLimit} articles per month</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      {plan.canPublish ? (
                        <>
                          <Check className="h-4 w-4 text-success" />
                          <span>WordPress publishing</span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">No publishing</span>
                        </>
                      )}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>AI article generation</span>
                    </li>
                    {plan.name === "Pro" && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success" />
                        <span>Priority support</span>
                      </li>
                    )}
                  </ul>

                  {isCurrentPlan ? (
                    <Button variant="outline" disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : showTrialButton ? (
                    <Button 
                      onClick={handleStartTrial} 
                      className="w-full"
                      disabled={upgrading}
                    >
                      {upgrading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Start Free Trial
                    </Button>
                  ) : isUpgrade ? (
                    <Button 
                      onClick={() => handleUpgrade(plan)} 
                      className="w-full"
                      disabled={upgrading}
                    >
                      {upgrading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Upgrade to {plan.name}
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => handleUpgrade(plan)}
                      className="w-full"
                    >
                      Downgrade to {plan.name}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

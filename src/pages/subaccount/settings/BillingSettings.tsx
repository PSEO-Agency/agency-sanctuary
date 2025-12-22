import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, X, Zap, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

export default function BillingSettings() {
  const { subaccountId } = useParams();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [plans, setPlans] = useState<PlanDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [subaccountId]);

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
          canPublish: p.can_publish,
        })));
      }

      // Fetch current subscription
      const { data: subData } = await supabase
        .from("subaccount_subscriptions")
        .select(`
          articles_used,
          other_credits,
          billing_period_end,
          plan_id
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
              canPublish: currentPlan.can_publish,
            },
            articlesUsed: subData.articles_used,
            otherCredits: subData.other_credits,
            billingPeriodEnd: new Date(subData.billing_period_end),
          });
        }
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      const { error } = await supabase
        .from("subaccount_subscriptions")
        .update({ plan_id: planId })
        .eq("subaccount_id", subaccountId);

      if (error) throw error;

      toast.success("Plan upgraded successfully!");
      fetchData();
    } catch (error) {
      console.error("Error upgrading plan:", error);
      toast.error("Failed to upgrade plan");
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Billing</h2>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan Card */}
      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{subscription.plan.name} Plan</CardTitle>
                <CardDescription>
                  {subscription.plan.priceMonthly === 0 
                    ? "Free" 
                    : `€${subscription.plan.priceMonthly}/month`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Usage Stats */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Articles Used</span>
                <span className="font-medium">
                  {subscription.articlesUsed} / {subscription.plan.articleLimit}
                </span>
              </div>
              <Progress 
                value={usagePercentage} 
                className={`h-2 ${usagePercentage >= 80 ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`}
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Other Credits</span>
              <span className="font-medium">{subscription.otherCredits} remaining</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Billing Period Ends</span>
              <span className="font-medium">
                {subscription.billingPeriodEnd.toLocaleDateString()}
              </span>
            </div>
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

              return (
                <div 
                  key={plan.id}
                  className={`relative border rounded-lg p-5 ${
                    isCurrentPlan 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
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
                  ) : isUpgrade ? (
                    <Button 
                      onClick={() => handleUpgrade(plan.id)} 
                      className="w-full"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Upgrade to {plan.name}
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => handleUpgrade(plan.id)}
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

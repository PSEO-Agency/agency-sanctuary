import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, X, Zap, FileText, Loader2, CreditCard, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSubaccountUsage } from "@/hooks/useSubaccountUsage";

interface PlanDetails {
  id: string;
  name: string;
  priceMonthly: number;
  articleLimit: number;
  canPublish: boolean;
}

export default function BillingSettings() {
  const { subaccountId } = useParams();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<PlanDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [managingPortal, setManagingPortal] = useState(false);

  // Use the shared usage hook for consistent data
  const usage = useSubaccountUsage(subaccountId);

  useEffect(() => {
    fetchPlans();
    
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated successfully!");
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Checkout was canceled");
    } else if (searchParams.get("trial") === "activated") {
      toast.success("Your 7-day free trial has started!");
    }
  }, [subaccountId, searchParams]);

  const fetchPlans = async () => {
    try {
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

      if (subaccountId) {
        supabase.functions.invoke("check-subscription", {
          body: { subaccountId },
        }).then(() => usage.refetch()).catch(console.error);
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
      if (data?.url) window.open(data.url, "_blank");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to start trial");
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    setManagingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { subaccountId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to open billing portal");
    } finally {
      setManagingPortal(false);
    }
  };

  if (loading || usage.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Billing</h2>
          <p className="text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }

  const usagePercentage = (usage.articlesUsedPeriod / usage.articleLimit) * 100;
  const trialDaysRemaining = usage.trialEndsAt 
    ? Math.max(0, Math.ceil((new Date(usage.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const currentPlan = plans.find(p => p.name === usage.planName);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Billing</h2>
        <p className="text-muted-foreground">Manage your subscription and billing information</p>
      </div>

      {usage.isTrial && (
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
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{usage.planName} Plan</CardTitle>
                <CardDescription>
                  {currentPlan?.priceMonthly === 0 ? "Free" : `€${currentPlan?.priceMonthly}/month`}
                </CardDescription>
              </div>
            </div>
            {usage.paymentMethodAdded && (
              <Button variant="outline" onClick={handleManageSubscription} disabled={managingPortal}>
                {managingPortal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                Manage Subscription
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Articles Used This Month</span>
              <span className="font-medium">{usage.articlesUsedPeriod} / {usage.articleLimit}</span>
            </div>
            <Progress 
              value={usagePercentage} 
              className={cn("h-2", usagePercentage >= 90 ? "[&>div]:bg-destructive" : usagePercentage >= 75 ? "[&>div]:bg-warning" : "[&>div]:bg-primary")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compare Plans</CardTitle>
          <CardDescription>Choose the plan that's right for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const isCurrentPlan = plan.name === usage.planName;
              const isUpgrade = currentPlan && plan.priceMonthly > currentPlan.priceMonthly;

              return (
                <div key={plan.id} className={cn("relative border rounded-lg p-5", isCurrentPlan ? "border-primary bg-primary/5" : "border-border")}>
                  {isCurrentPlan && <div className="absolute -top-3 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">Current Plan</div>}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-2xl font-bold">{plan.priceMonthly === 0 ? "Free" : `€${plan.priceMonthly}`}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                  </div>
                  <ul className="space-y-2 mb-5">
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" />{plan.articleLimit} articles per month</li>
                    <li className="flex items-center gap-2 text-sm">
                      {plan.canPublish ? <><Check className="h-4 w-4 text-success" />WordPress publishing</> : <><X className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">No publishing</span></>}
                    </li>
                  </ul>
                  {isCurrentPlan ? (
                    <Button variant="outline" disabled className="w-full">Current Plan</Button>
                  ) : isUpgrade ? (
                    <Button onClick={handleStartTrial} className="w-full" disabled={upgrading}>
                      {upgrading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                      Upgrade to {plan.name}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
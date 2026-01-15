import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Zap, Clock, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrialStatusWidgetProps {
  subaccountId: string;
}

export function TrialStatusWidget({ subaccountId }: TrialStatusWidgetProps) {
  const navigate = useNavigate();
  const [upgrading, setUpgrading] = useState(false);
  const {
    isTrialing,
    daysRemaining,
    planName,
    articlesUsed,
    articleLimit,
    isLoading,
    subscriptionStatus,
    hasPaymentMethod,
  } = useTrialStatus(subaccountId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-10 h-10">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate progress for the circular indicator
  const progress = isTrialing ? (daysRemaining / 7) * 100 : 0;
  const usageProgress = (articlesUsed / articleLimit) * 100;

  // Determine color based on days remaining
  const getTrialColor = () => {
    if (daysRemaining >= 5) return "text-success";
    if (daysRemaining >= 2) return "text-warning";
    return "text-destructive";
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
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start trial";
      toast.error(message);
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageBilling = () => {
    navigate(`/subaccount/${subaccountId}/settings/billing`);
  };

  // Calculate article usage color
  const getUsageColor = () => {
    if (usageProgress >= 90) return "text-destructive";
    if (usageProgress >= 75) return "text-warning";
    return "text-primary";
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all hover:scale-105",
            isTrialing
              ? cn("border-transparent", getTrialColor())
              : subscriptionStatus === "active"
              ? "border-transparent"
              : "border-border bg-muted"
          )}
          title={`${articlesUsed}/${articleLimit} articles used`}
        >
          {/* Circular progress ring for article usage */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            {/* Background circle */}
            <circle
              cx="20"
              cy="20"
              r="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted/30"
            />
            {/* Progress circle */}
            <circle
              cx="20"
              cy="20"
              r="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${Math.min(usageProgress, 100) * 1.07} 107`}
              className={isTrialing ? getTrialColor() : getUsageColor()}
            />
          </svg>
          
          {/* Center icon/content */}
          <div className="relative z-10">
            {isTrialing ? (
              <span className={cn("text-xs font-bold", getTrialColor())}>
                {daysRemaining}
              </span>
            ) : (
              <FileText className={cn("h-4 w-4", getUsageColor())} />
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <div className="space-y-4">
          {/* Plan Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  isTrialing
                    ? "bg-warning animate-pulse"
                    : subscriptionStatus === "active"
                    ? "bg-success"
                    : "bg-muted-foreground"
                )}
              />
              <span className="font-medium">
                {isTrialing ? "Trial" : planName} Plan
              </span>
            </div>
            {isTrialing && (
              <span className={cn("text-sm font-medium", getTrialColor())}>
                {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
              </span>
            )}
          </div>

          {/* Trial countdown */}
          {isTrialing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Trial ends in {daysRemaining} days</span>
              </div>
              <Progress 
                value={progress} 
                className={cn(
                  "h-2",
                  daysRemaining >= 5 ? "[&>div]:bg-success" : 
                  daysRemaining >= 2 ? "[&>div]:bg-warning" : 
                  "[&>div]:bg-destructive"
                )}
              />
            </div>
          )}

          {/* Article Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                Articles
              </span>
              <span className="font-medium">
                {articlesUsed} / {articleLimit}
              </span>
            </div>
            <Progress 
              value={usageProgress} 
              className={cn(
                "h-2",
                usageProgress >= 90 ? "[&>div]:bg-destructive" :
                usageProgress >= 75 ? "[&>div]:bg-warning" :
                "[&>div]:bg-primary"
              )}
            />
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            {!hasPaymentMethod && subscriptionStatus !== "active" && (
              <Button 
                onClick={handleStartTrial} 
                className="w-full" 
                size="sm"
                disabled={upgrading}
              >
                {upgrading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                {isTrialing ? "Add Payment Method" : "Start 7-Day Free Trial"}
              </Button>
            )}
            <Button 
              onClick={handleManageBilling} 
              variant={hasPaymentMethod ? "default" : "outline"} 
              className="w-full" 
              size="sm"
            >
              Manage Billing
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

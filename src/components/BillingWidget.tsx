import { FileText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface BillingWidgetProps {
  subaccountId: string;
  planName: string;
  articlesUsed: number;
  articleLimit: number;
  otherCredits: number;
  weeksUntilReset: number;
  collapsed?: boolean;
}

export function BillingWidget({
  subaccountId,
  planName,
  articlesUsed,
  articleLimit,
  otherCredits,
  weeksUntilReset,
  collapsed = false,
}: BillingWidgetProps) {
  if (collapsed) return null;

  const usagePercentage = (articlesUsed / articleLimit) * 100;
  const isNearLimit = usagePercentage >= 80;

  return (
    <div className="space-y-3">
      {/* Plan Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-muted flex items-center justify-center">
          <FileText className="h-4 w-4 text-sidebar-foreground" />
        </div>
        <span className="font-medium text-sm text-sidebar-foreground">{planName} Plan</span>
      </div>

      {/* Articles Usage */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-sidebar-foreground/70">Articles</span>
          <span className="text-sidebar-foreground">
            {articlesUsed} / {articleLimit}
          </span>
        </div>
        <Progress 
          value={usagePercentage} 
          className={`h-1 ${isNearLimit ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`}
        />
      </div>

      {/* Reset Info */}
      <p className="text-xs text-sidebar-foreground/60">
        Usage resets in {weeksUntilReset} week{weeksUntilReset !== 1 ? 's' : ''}
      </p>

      {/* Other Credits */}
      <p className="text-xs text-sidebar-foreground/70">
        Other Credits <span className="text-sidebar-foreground">{otherCredits}</span> remaining
      </p>

      {/* Upgrade Button */}
      <NavLink to={`/subaccount/${subaccountId}/settings/billing`}>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs h-8 border-sidebar-border text-sidebar-foreground hover:bg-muted"
        >
          Upgrade plan
        </Button>
      </NavLink>
    </div>
  );
}

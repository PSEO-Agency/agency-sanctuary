import { FileText, ChevronRight } from "lucide-react";
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
    <div className="px-3 py-3 border border-sidebar-border rounded-lg bg-sidebar-accent/30">
      {/* Plan Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium text-sidebar-foreground">{planName} plan</span>
      </div>

      {/* Articles Usage */}
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-sidebar-foreground/70">Articles</span>
          <span className="text-sidebar-foreground font-medium">
            {articlesUsed}/{articleLimit}
          </span>
        </div>
        <Progress 
          value={usagePercentage} 
          className={`h-1.5 ${isNearLimit ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`}
        />
      </div>

      {/* Reset Info */}
      <p className="text-xs text-sidebar-foreground/60 mb-2">
        Usage resets in {weeksUntilReset} week{weeksUntilReset !== 1 ? 's' : ''}
      </p>

      {/* Other Credits */}
      <p className="text-xs text-sidebar-foreground/70 mb-3">
        Other Credits <span className="font-medium text-sidebar-foreground">{otherCredits}</span> remaining
      </p>

      {/* Upgrade Button */}
      <NavLink to={`/subaccount/${subaccountId}/settings/billing`}>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between text-xs h-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          Upgrade plan
          <ChevronRight className="h-3 w-3" />
        </Button>
      </NavLink>
    </div>
  );
}

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
        <div className="w-7 h-7 rounded bg-white/20 flex items-center justify-center">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <span className="font-medium text-sm text-white">{planName} Plan</span>
      </div>

      {/* Articles Usage */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-white/70">Articles</span>
          <span className="text-white">
            {articlesUsed} / {articleLimit}
          </span>
        </div>
        <Progress 
          value={usagePercentage} 
          className={`h-1 bg-white/20 ${isNearLimit ? '[&>div]:bg-destructive' : '[&>div]:bg-white'}`}
        />
      </div>

      {/* Reset Info */}
      <p className="text-xs text-white/60">
        Usage resets in {weeksUntilReset} week{weeksUntilReset !== 1 ? 's' : ''}
      </p>

      {/* Other Credits */}
      <p className="text-xs text-white/70">
        Other Credits <span className="text-white">{otherCredits}</span> remaining
      </p>

      {/* Upgrade Button */}
      <NavLink to={`/subaccount/${subaccountId}/settings/billing`}>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs h-8 border-white/30 text-white hover:bg-white/10 bg-transparent"
        >
          Upgrade plan
        </Button>
      </NavLink>
    </div>
  );
}

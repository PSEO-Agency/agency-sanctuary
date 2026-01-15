import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Campaign } from "./types";
import { cn } from "@/lib/utils";

interface CampaignCardProps {
  campaign: Campaign;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CampaignCard({ campaign, onView, onDelete }: CampaignCardProps) {
  return (
    <div className="border rounded-xl p-5 space-y-4 bg-card">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Avatar/Logo Placeholder */}
          <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0" />
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{campaign.name}</h3>
              <Badge
                className={cn(
                  "text-xs",
                  campaign.status === "Active"
                    ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                    : campaign.status === "Draft"
                    ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {campaign.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {campaign.description}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(campaign.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="font-medium">Pages Generated:</span>{" "}
            <span className="text-primary font-semibold">{campaign.pagesGenerated}</span>
            <span className="text-muted-foreground">/{campaign.totalPages}</span>
          </div>
          <a href="#" className="text-primary hover:underline">
            {campaign.clicks} clicks
          </a>
        </div>
        <Button onClick={() => onView(campaign.id)}>View</Button>
      </div>
    </div>
  );
}

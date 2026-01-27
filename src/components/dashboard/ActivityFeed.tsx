import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, FileText, Building2, Globe, Users, Rocket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export type ActivityType = 
  | "subaccount_created"
  | "campaign_created"
  | "article_published"
  | "wordpress_connected"
  | "user_joined"
  | "campaign_launched";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

const activityIcons: Record<ActivityType, typeof FileText> = {
  subaccount_created: Building2,
  campaign_created: Rocket,
  article_published: FileText,
  wordpress_connected: Globe,
  user_joined: Users,
  campaign_launched: Rocket,
};

const activityColors: Record<ActivityType, string> = {
  subaccount_created: "bg-blue-100 text-blue-600",
  campaign_created: "bg-purple-100 text-purple-600",
  article_published: "bg-green-100 text-green-600",
  wordpress_connected: "bg-orange-100 text-orange-600",
  user_joined: "bg-cyan-100 text-cyan-600",
  campaign_launched: "bg-pink-100 text-pink-600",
};

interface ActivityFeedProps {
  activities: ActivityItem[];
  title?: string;
  maxItems?: number;
  emptyMessage?: string;
}

export function ActivityFeed({
  activities,
  title = "Recent Activity",
  maxItems = 5,
  emptyMessage = "No recent activity",
}: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {displayedActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-4">
            {displayedActivities.map((activity) => {
              const Icon = activityIcons[activity.type];
              const colorClass = activityColors[activity.type];

              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-full shrink-0", colorClass)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

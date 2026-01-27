import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Announcement, AudienceLevel } from "@/hooks/useAnnouncements";

interface AnnouncementCardProps {
  announcement: Announcement;
  isRead: boolean;
  onMarkRead?: () => void;
  compact?: boolean;
  showAudienceBadges?: boolean;
}

const AUDIENCE_LABELS: Record<AudienceLevel, { label: string; className: string }> = {
  country_partner: { label: "Partners", className: "bg-orange-100 text-orange-700" },
  agency: { label: "Agencies", className: "bg-blue-100 text-blue-700" },
  subaccount: { label: "Accounts", className: "bg-purple-100 text-purple-700" },
};

export function AnnouncementCard({ 
  announcement, 
  isRead, 
  onMarkRead,
  compact = false,
  showAudienceBadges = false,
}: AnnouncementCardProps) {
  const timeAgo = formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true });

  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
          !isRead && "bg-primary/5"
        )}
        onClick={onMarkRead}
      >
        <div className={cn(
          "mt-1.5 w-2 h-2 rounded-full shrink-0",
          isRead ? "bg-muted-foreground/30" : "bg-primary"
        )} />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm truncate",
            !isRead && "font-medium"
          )}>
            {announcement.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
        </div>
        {!isRead && onMarkRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden",
      !isRead && "ring-2 ring-primary/20"
    )}>
      {announcement.image_url && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img 
            src={announcement.image_url} 
            alt={announcement.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{announcement.title}</h3>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
          {!isRead && (
            <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary">
              New
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3">
          {announcement.description}
        </p>

        {showAudienceBadges && announcement.audience.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {announcement.audience.map(level => (
              <Badge key={level} variant="secondary" className={cn("text-xs", AUDIENCE_LABELS[level].className)}>
                {AUDIENCE_LABELS[level].label}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {announcement.cta_url && announcement.cta_text && (
            <Button size="sm" asChild>
              <a href={announcement.cta_url} target="_blank" rel="noopener noreferrer">
                {announcement.cta_text}
                <ExternalLink className="ml-1.5 h-3 w-3" />
              </a>
            </Button>
          )}
          {!isRead && onMarkRead && (
            <Button size="sm" variant="ghost" onClick={onMarkRead}>
              <Check className="mr-1.5 h-3 w-3" />
              Mark as read
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

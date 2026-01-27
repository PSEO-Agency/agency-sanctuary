import { formatDistanceToNow, format } from "date-fns";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Announcement, AudienceLevel } from "@/hooks/useAnnouncements";

interface AnnouncementDetailDialogProps {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showAudienceBadges?: boolean;
}

const AUDIENCE_LABELS: Record<AudienceLevel, { label: string; className: string }> = {
  country_partner: { label: "Partners", className: "bg-orange-100 text-orange-700" },
  agency: { label: "Agencies", className: "bg-blue-100 text-blue-700" },
  subaccount: { label: "Accounts", className: "bg-purple-100 text-purple-700" },
};

export function AnnouncementDetailDialog({ 
  announcement, 
  open, 
  onOpenChange,
  showAudienceBadges = false,
}: AnnouncementDetailDialogProps) {
  if (!announcement) return null;

  const timeAgo = formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true });
  const formattedDate = format(new Date(announcement.published_at), "MMMM d, yyyy 'at' h:mm a");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Image Header */}
        {announcement.image_url && (
          <div className="relative w-full aspect-video bg-muted">
            <img 
              src={announcement.image_url} 
              alt={announcement.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-4">
          <DialogHeader className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-xl font-bold">
                {announcement.title}
              </DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              {formattedDate} ({timeAgo})
            </p>
          </DialogHeader>

          {/* Audience Badges */}
          {showAudienceBadges && announcement.audience.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {announcement.audience.map(level => (
                <Badge 
                  key={level} 
                  variant="secondary" 
                  className={cn("text-xs", AUDIENCE_LABELS[level].className)}
                >
                  {AUDIENCE_LABELS[level].label}
                </Badge>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground whitespace-pre-wrap">
              {announcement.description}
            </p>
          </div>

          {/* CTA Button */}
          {announcement.cta_url && announcement.cta_text && (
            <div className="pt-4">
              <Button asChild>
                <a href={announcement.cta_url} target="_blank" rel="noopener noreferrer">
                  {announcement.cta_text}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

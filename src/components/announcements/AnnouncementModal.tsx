import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnnouncementCard } from "./AnnouncementCard";
import { useAnnouncements } from "@/hooks/useAnnouncements";

interface AnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnnouncementModal({ open, onOpenChange }: AnnouncementModalProps) {
  const { unreadAnnouncements, markAsRead, isRead } = useAnnouncements();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index when modal opens or unread list changes
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
    }
  }, [open, unreadAnnouncements.length]);

  const currentAnnouncement = unreadAnnouncements[currentIndex];
  const totalUnread = unreadAnnouncements.length;

  const handleNext = () => {
    if (currentIndex < totalUnread - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleMarkReadAndNext = async () => {
    if (currentAnnouncement) {
      await markAsRead(currentAnnouncement.id);
      
      // If this was the last one, close the modal
      if (totalUnread <= 1) {
        onOpenChange(false);
      } else if (currentIndex >= totalUnread - 1) {
        setCurrentIndex(prev => Math.max(0, prev - 1));
      }
    }
  };

  const handleDismissAll = () => {
    onOpenChange(false);
  };

  if (!currentAnnouncement) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              📢 New Announcement
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {totalUnread} unread
              </Badge>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-4 pt-2">
          <AnnouncementCard
            announcement={currentAnnouncement}
            isRead={isRead(currentAnnouncement.id)}
            showAudienceBadges={false}
          />
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{currentIndex + 1}</span>
            <span>of</span>
            <span className="font-medium text-foreground">{totalUnread}</span>
            <span>unread</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button onClick={handleMarkReadAndNext}>
              Mark as Read
              {currentIndex < totalUnread - 1 && (
                <ChevronRight className="ml-1 h-4 w-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex >= totalUnread - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4"
          onClick={handleDismissAll}
        >
          <X className="h-4 w-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}

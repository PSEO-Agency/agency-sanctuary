import { useState } from "react";
import { Megaphone, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AnnouncementCard } from "./AnnouncementCard";
import { useAnnouncements, type AudienceLevel } from "@/hooks/useAnnouncements";
import { cn } from "@/lib/utils";

interface AnnouncementDropdownProps {
  variant?: "default" | "super-admin";
}

export function AnnouncementDropdown({ variant = "default" }: AnnouncementDropdownProps) {
  const { 
    unreadCount, 
    userAudienceLevels,
    getAnnouncementsByAudience,
    getUnreadByAudience,
    markAsRead,
    markAllAsRead,
    isRead,
  } = useAnnouncements();

  const [open, setOpen] = useState(false);
  
  // Determine tabs based on user role
  const tabs: { value: AudienceLevel; label: string }[] = [];
  
  if (userAudienceLevels.includes("country_partner")) {
    tabs.push({ value: "country_partner", label: "Partner" });
  }
  if (userAudienceLevels.includes("agency") || userAudienceLevels.includes("country_partner")) {
    tabs.push({ value: "agency", label: "Agency" });
  }
  tabs.push({ value: "subaccount", label: "Account" });

  const [activeTab, setActiveTab] = useState<AudienceLevel>(tabs[0]?.value || "subaccount");

  const currentAnnouncements = getAnnouncementsByAudience(activeTab);
  const currentUnread = getUnreadByAudience(activeTab);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Megaphone className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-50" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Announcements</h4>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={markAllAsRead}
              >
                <Check className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {tabs.length > 1 ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AudienceLevel)}>
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
              {tabs.map(tab => {
                const tabUnread = getUnreadByAudience(tab.value).length;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "relative rounded-none border-b-2 border-transparent px-4 py-2 text-sm",
                      "data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    )}
                  >
                    {tab.label}
                    {tabUnread > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="ml-1.5 h-5 min-w-[20px] px-1 text-xs bg-primary/10 text-primary"
                      >
                        {tabUnread}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {tabs.map(tab => (
              <TabsContent key={tab.value} value={tab.value} className="m-0">
                <AnnouncementList 
                  announcements={getAnnouncementsByAudience(tab.value)}
                  isRead={isRead}
                  onMarkRead={markAsRead}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <AnnouncementList 
            announcements={currentAnnouncements}
            isRead={isRead}
            onMarkRead={markAsRead}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

interface AnnouncementListProps {
  announcements: ReturnType<typeof useAnnouncements>["announcements"];
  isRead: (id: string) => boolean;
  onMarkRead: (id: string) => void;
}

function AnnouncementList({ announcements, isRead, onMarkRead }: AnnouncementListProps) {
  if (announcements.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No announcements yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[300px]">
      <div className="p-1">
        {announcements.slice(0, 10).map(announcement => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            isRead={isRead(announcement.id)}
            onMarkRead={() => onMarkRead(announcement.id)}
            compact
          />
        ))}
      </div>
      {announcements.length > 10 && (
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full text-sm" size="sm">
            View all announcements
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </ScrollArea>
  );
}

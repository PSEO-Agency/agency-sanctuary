import { useState } from "react";
import { Plus, Megaphone, Send, FileEdit, Trash2, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateAnnouncementDialog } from "@/components/announcements/CreateAnnouncementDialog";
import { useAnnouncements, type Announcement, type AudienceLevel } from "@/hooks/useAnnouncements";
import { cn } from "@/lib/utils";

const AUDIENCE_LABELS: Record<AudienceLevel, { label: string; className: string }> = {
  country_partner: { label: "Partners", className: "bg-orange-100 text-orange-700" },
  agency: { label: "Agencies", className: "bg-blue-100 text-blue-700" },
  subaccount: { label: "Accounts", className: "bg-purple-100 text-purple-700" },
};

export default function Announcements() {
  const { announcements, deleteAnnouncement, updateAnnouncement, isLoading } = useAnnouncements();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "drafts" | "published">("all");

  const filteredAnnouncements = announcements.filter(a => {
    if (activeTab === "drafts") return a.is_draft;
    if (activeTab === "published") return !a.is_draft;
    return true;
  });

  const draftsCount = announcements.filter(a => a.is_draft).length;
  const publishedCount = announcements.filter(a => !a.is_draft).length;

  const handleDelete = async () => {
    if (selectedAnnouncement) {
      await deleteAnnouncement(selectedAnnouncement.id);
      setDeleteDialogOpen(false);
      setSelectedAnnouncement(null);
    }
  };

  const handlePublish = async (announcement: Announcement) => {
    await updateAnnouncement(announcement.id, { is_draft: false });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Announcements
          </h1>
          <p className="text-muted-foreground">
            Create and manage announcements for your users
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2">
              {announcements.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="published">
            <Send className="h-4 w-4 mr-1" />
            Published
            <Badge variant="secondary" className="ml-2">
              {publishedCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="drafts">
            <FileEdit className="h-4 w-4 mr-1" />
            Drafts
            <Badge variant="secondary" className="ml-2">
              {draftsCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading announcements...
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/30">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No announcements yet</p>
              <p className="text-sm mt-1">
                Create your first announcement to notify your users
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Announcement
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnnouncements.map(announcement => (
                    <TableRow key={announcement.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {announcement.image_url && (
                            <img 
                              src={announcement.image_url} 
                              alt=""
                              className="w-12 h-8 rounded object-cover bg-muted"
                            />
                          )}
                          <div>
                            <p className="font-medium">{announcement.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {announcement.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
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
                      </TableCell>
                      <TableCell>
                        {announcement.is_draft ? (
                          <Badge variant="secondary">Draft</Badge>
                        ) : new Date(announcement.published_at) > new Date() ? (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                            Scheduled
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700">
                            Published
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(announcement.published_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {announcement.is_draft && (
                              <DropdownMenuItem onClick={() => handlePublish(announcement)}>
                                <Send className="h-4 w-4 mr-2" />
                                Publish Now
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setSelectedAnnouncement(announcement);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <CreateAnnouncementDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAnnouncement?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

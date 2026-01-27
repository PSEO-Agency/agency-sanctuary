import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Upload, X, Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AudienceSelector } from "./AudienceSelector";
import { AIImageGenerator } from "./AIImageGenerator";
import { useAnnouncements, type AudienceLevel, type CreateAnnouncementInput } from "@/hooks/useAnnouncements";

interface CreateAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAnnouncementDialog({ open, onOpenChange }: CreateAnnouncementDialogProps) {
  const { createAnnouncement } = useAnnouncements();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [audience, setAudience] = useState<AudienceLevel[]>([]);
  const [publishDate, setPublishDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageTab, setImageTab] = useState<"upload" | "ai">("upload");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageUrl(null);
    setCtaText("");
    setCtaUrl("");
    setAudience([]);
    setPublishDate(new Date());
    setImageTab("upload");
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!title.trim() || !description.trim() || audience.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const data: CreateAnnouncementInput = {
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl,
        cta_text: ctaText.trim() || null,
        cta_url: ctaUrl.trim() || null,
        audience,
        published_at: publishDate.toISOString(),
        is_draft: isDraft,
      };

      await createAnnouncement(data);
      resetForm();
      onOpenChange(false);
    } catch {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = title.trim() && description.trim() && audience.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Announcement</DialogTitle>
          <DialogDescription>
            Create a new announcement to notify your users about updates and features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Write your announcement content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Image Section */}
          <div className="space-y-2">
            <Label>Image (optional)</Label>
            
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img 
                  src={imageUrl} 
                  alt="Preview" 
                  className="w-full aspect-video object-cover"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => setImageUrl(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as "upload" | "ai")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload URL
                  </TabsTrigger>
                  <TabsTrigger value="ai">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate AI
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter image URL"
                      onChange={(e) => setImageUrl(e.target.value || null)}
                    />
                    <Button variant="outline" size="icon">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="ai">
                  <AIImageGenerator 
                    onImageGenerated={setImageUrl}
                    selectedAudience={audience}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* CTA Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ctaText">CTA Button Text (optional)</Label>
              <Input
                id="ctaText"
                placeholder="Learn More"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaUrl">CTA URL (optional)</Label>
              <Input
                id="ctaUrl"
                placeholder="https://docs.example.com"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Audience Selector */}
          <AudienceSelector value={audience} onChange={setAudience} />

          {/* Publish Date */}
          <div className="space-y-2">
            <Label>Publish Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !publishDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {publishDate ? format(publishDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="single"
                  selected={publishDate}
                  onSelect={(date) => date && setPublishDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || !isValid}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !isValid}
          >
            Publish Announcement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

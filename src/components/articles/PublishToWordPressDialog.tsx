import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWordPressConnections, WordPressConnection } from "@/hooks/useWordPressConnections";
import { Link } from "react-router-dom";

interface PublishToWordPressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: {
    id?: string;
    airtableId?: string;
    title: string;
    content: string;
    excerpt?: string;
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    focusKeyword?: string;
    categories?: string[];
    tags?: string[];
    featuredImageUrl?: string;
    imageUrl?: string;
  };
  onPublishSuccess?: (result: { postId: number; postUrl: string }) => void;
}

export function PublishToWordPressDialog({
  open,
  onOpenChange,
  article,
  onPublishSuccess,
}: PublishToWordPressDialogProps) {
  const { subaccountId } = useParams();
  const { connections, loading: connectionsLoading, getConnectedConnections } = useWordPressConnections(subaccountId);
  
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [publishStatus, setPublishStatus] = useState<"draft" | "publish">("draft");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    postUrl?: string;
    postId?: number;
  } | null>(null);

  const connectedConnections = getConnectedConnections();

  useEffect(() => {
    if (open && connectedConnections.length > 0 && !selectedConnectionId) {
      setSelectedConnectionId(connectedConnections[0].id);
    }
  }, [open, connectedConnections, selectedConnectionId]);

  const handlePublish = async () => {
    if (!selectedConnectionId) {
      toast.error("Please select a WordPress site");
      return;
    }

    if (!article.title || !article.content) {
      toast.error("Article must have title and content");
      return;
    }

    setPublishing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("wordpress-publish", {
        body: {
          connectionId: selectedConnectionId,
          subaccountId,
          article: {
            ...article,
            airtableId: article.airtableId || article.id,
          },
          publishStatus,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setResult({
          success: true,
          message: `Article ${publishStatus === "publish" ? "published" : "saved as draft"} successfully!`,
          postUrl: data.postUrl,
          postId: data.postId,
        });
        toast.success("Article published to WordPress!");
        onPublishSuccess?.({ postId: data.postId, postUrl: data.postUrl });
      } else {
        setResult({
          success: false,
          message: data?.error || "Failed to publish article",
        });
        toast.error(data?.error || "Failed to publish article");
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "Failed to publish article",
      });
      toast.error(error.message || "Failed to publish article");
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish to WordPress</DialogTitle>
          <DialogDescription>
            Send this article to your WordPress site
          </DialogDescription>
        </DialogHeader>

        {connectionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : connectedConnections.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No WordPress sites connected. Add a connection first.
            </p>
            <Link to={`/subaccount/${subaccountId}/connections`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add WordPress Site
              </Button>
            </Link>
          </div>
        ) : result?.success ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="ml-2">
                {result.message}
              </AlertDescription>
            </Alert>
            {result.postUrl && (
              <div className="flex justify-center">
                <a
                  href={result.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in WordPress
                  </Button>
                </a>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Article Preview */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium mb-1 line-clamp-1">{article.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {article.excerpt || article.metaDescription || "No excerpt"}
              </p>
            </div>

            {/* Connection Selection */}
            <div className="space-y-2">
              <Label>Destination</Label>
              <Select
                value={selectedConnectionId}
                onValueChange={setSelectedConnectionId}
                disabled={publishing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select WordPress site" />
                </SelectTrigger>
                <SelectContent>
                  {connectedConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Publish Status */}
            <div className="space-y-2">
              <Label>Publish Status</Label>
              <RadioGroup
                value={publishStatus}
                onValueChange={(value) => setPublishStatus(value as "draft" | "publish")}
                className="flex gap-6"
                disabled={publishing}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="draft" id="draft" />
                  <Label htmlFor="draft" className="font-normal cursor-pointer">
                    Save as Draft
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="publish" id="publish" />
                  <Label htmlFor="publish" className="font-normal cursor-pointer">
                    Publish Immediately
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Error Message */}
            {result && !result.success && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  {result.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={publishing}
              >
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={publishing}>
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    {publishStatus === "publish" ? "Publish Now" : "Save as Draft"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

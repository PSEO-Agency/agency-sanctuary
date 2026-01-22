import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { validateConnectionInput, normalizeBaseUrl } from "@/lib/wordpressPublisher";
import { WordPressConnection } from "@/hooks/useWordPressConnections";

interface EditConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: WordPressConnection;
  onUpdate: (connectionId: string, data: Partial<{ name: string; base_url: string; api_key: string }>) => Promise<void>;
}

export function EditConnectionDialog({
  open,
  onOpenChange,
  connection,
  onUpdate,
}: EditConnectionDialogProps) {
  const [name, setName] = useState(connection.name);
  const [baseUrl, setBaseUrl] = useState(connection.base_url);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(connection.name);
      setBaseUrl(connection.base_url);
      setApiKey(""); // Don't show existing API key for security
    }
  }, [open, connection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateConnectionInput({ 
      name, 
      baseUrl, 
      apiKey: apiKey || connection.api_key // Use existing if not changed
    });
    
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    setLoading(true);
    try {
      const updateData: Partial<{ name: string; base_url: string; api_key: string }> = {
        name: name.trim(),
        base_url: normalizeBaseUrl(baseUrl),
      };

      // Only include API key if user entered a new one
      if (apiKey.trim()) {
        updateData.api_key = apiKey.trim();
      }

      await onUpdate(connection.id, updateData);
      toast.success("Connection updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update connection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Connection</DialogTitle>
          <DialogDescription>
            Update your WordPress site connection details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Connection Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-baseUrl">WordPress Site URL</Label>
            <Input
              id="edit-baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-apiKey">API Key (leave blank to keep existing)</Label>
            <Input
              id="edit-apiKey"
              type="password"
              placeholder="Enter new API key or leave blank"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Only enter a new API key if you want to change it
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

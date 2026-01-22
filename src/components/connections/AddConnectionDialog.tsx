import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Info, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { validateConnectionInput, normalizeBaseUrl, buildEndpoint } from "@/lib/wordpressPublisher";

interface AddConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string; base_url: string; api_key: string }) => Promise<any>;
}

export function AddConnectionDialog({
  open,
  onOpenChange,
  onCreate,
}: AddConnectionDialogProps) {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateConnectionInput({ name, baseUrl, apiKey });
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { handshakeResult } = await onCreate({
        name: name.trim(),
        base_url: normalizeBaseUrl(baseUrl),
        api_key: apiKey.trim(),
      });

      if (handshakeResult?.success) {
        setResult({ success: true, message: "Connection successful!" });
        toast.success("WordPress site connected successfully!");
        setTimeout(() => {
          onOpenChange(false);
          resetForm();
        }, 1500);
      } else {
        setResult({
          success: false,
          message: handshakeResult?.error || "Connection failed",
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "Failed to create connection",
      });
      toast.error(error.message || "Failed to create connection");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setBaseUrl("");
    setApiKey("");
    setResult(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const copyEndpoint = () => {
    if (baseUrl) {
      const endpoint = buildEndpoint(baseUrl, '/pscm/v1/ping');
      navigator.clipboard.writeText(endpoint);
      toast.success("Endpoint copied to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add WordPress Site</DialogTitle>
          <DialogDescription>
            Connect your WordPress site to publish content directly from this platform
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Connection Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Connection Name</Label>
              <Input
                id="name"
                placeholder="e.g., My Blog"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to identify this WordPress site
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl">WordPress Site URL</Label>
              <Input
                id="baseUrl"
                placeholder="https://your-site.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Enter your WordPress site URL without trailing slash
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key (X-PSCM-KEY)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Paste your API key here"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Result Alert */}
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          {/* Setup Guide */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 text-primary" />
              Setup Guide
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Install and activate the <strong>Yoast SEO</strong> plugin (free)</li>
              <li>
                Install the <strong>"Programmatic SEO REST Bridge"</strong> plugin and activate it
              </li>
              <li>
                Go to <strong>WP Admin → Settings → Programmatic SEO Bridge</strong>
              </li>
              <li>Click <strong>"Generate API Key"</strong></li>
              <li>Copy the API key and paste it above</li>
              <li>Click <strong>"Save & Test Connection"</strong></li>
            </ol>
          </div>

          {/* Technical Details (collapsible) */}
          {baseUrl && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Technical Details</p>
              <div className="text-xs font-mono bg-background p-2 rounded border">
                <p>POST {buildEndpoint(baseUrl, '/pscm/v1/ping')}</p>
                <p>Header: X-PSCM-KEY: [your-api-key]</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyEndpoint}
                className="text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Endpoint
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                "Save & Test Connection"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

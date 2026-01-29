import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink } from "lucide-react";

interface DataForSEOConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (name: string, login: string, password: string) => Promise<boolean>;
  loading: boolean;
}

export function DataForSEOConnectDialog({
  open,
  onOpenChange,
  onConnect,
  loading,
}: DataForSEOConnectDialogProps) {
  const [name, setName] = useState("DataForSEO");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!login.trim() || !password.trim()) return;

    const success = await onConnect(name.trim(), login.trim(), password.trim());
    if (success) {
      setName("DataForSEO");
      setLogin("");
      setPassword("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect DataForSEO</DialogTitle>
          <DialogDescription>
            Enter your DataForSEO API credentials to enable keyword research features.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Connection Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My DataForSEO Account"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login">API Login (Email)</Label>
            <Input
              id="login"
              type="email"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="your@email.com"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">API Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Find your API credentials in your{" "}
              <a
                href="https://app.dataforseo.com/api-access"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                DataForSEO Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !login.trim() || !password.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

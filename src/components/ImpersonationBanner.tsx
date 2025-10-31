import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

export function ImpersonationBanner() {
  const { impersonation, profile, stopImpersonation } = useAuth();

  if (!impersonation?.isImpersonating) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">
          Viewing as {profile?.email}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={stopImpersonation}
        className="border-destructive-foreground text-destructive-foreground hover:bg-destructive-foreground hover:text-destructive"
      >
        Stop Impersonation
      </Button>
    </div>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

export function ImpersonationBanner() {
  const { impersonation, profile, stopImpersonation } = useAuth();

  if (!impersonation?.isImpersonating) return null;

  return (
    <div className="bg-primary text-white px-4 py-2 flex items-center justify-between fixed top-0 left-0 right-0 z-[9999]">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">
          Viewing as {profile?.email}
        </span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={stopImpersonation}
        className="bg-white text-primary hover:bg-gray-100 font-medium"
      >
        Stop Impersonation
      </Button>
    </div>
  );
}

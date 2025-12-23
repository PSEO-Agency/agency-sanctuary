import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteSubaccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subaccount: {
    id: string;
    name: string;
    location_id: string;
  } | null;
  onDeleted: () => void;
}

export function DeleteSubaccountDialog({
  open,
  onOpenChange,
  subaccount,
  onDeleted,
}: DeleteSubaccountDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleClose = () => {
    setStep(1);
    setConfirmText("");
    onOpenChange(false);
  };

  const handleProceedToStep2 = () => {
    setStep(2);
  };

  const handleDelete = async () => {
    if (!subaccount || confirmText !== "DELETE") return;

    try {
      setDeleting(true);

      // Delete all related data first
      // 1. Delete blog posts
      const { error: postsError } = await supabase
        .from("blog_posts")
        .delete()
        .eq("subaccount_id", subaccount.id);

      if (postsError) {
        console.error("Error deleting blog posts:", postsError);
      }

      // 2. Delete blog projects
      const { error: projectsError } = await supabase
        .from("blog_projects")
        .delete()
        .eq("subaccount_id", subaccount.id);

      if (projectsError) {
        console.error("Error deleting blog projects:", projectsError);
      }

      // 3. Delete subscription
      const { error: subscriptionError } = await supabase
        .from("subaccount_subscriptions")
        .delete()
        .eq("subaccount_id", subaccount.id);

      if (subscriptionError) {
        console.error("Error deleting subscription:", subscriptionError);
      }

      // 4. Update profiles to remove subaccount reference
      const { error: profilesError } = await supabase
        .from("profiles")
        .update({ sub_account_id: null })
        .eq("sub_account_id", subaccount.id);

      if (profilesError) {
        console.error("Error updating profiles:", profilesError);
      }

      // 5. Delete user roles for this subaccount
      const { error: rolesError } = await supabase
        .from("user_roles")
        .delete()
        .eq("context_type", "subaccount")
        .eq("context_id", subaccount.id);

      if (rolesError) {
        console.error("Error deleting user roles:", rolesError);
      }

      // 6. Finally delete the subaccount
      const { error } = await supabase
        .from("subaccounts")
        .delete()
        .eq("id", subaccount.id);

      if (error) throw error;

      toast.success(`Subaccount "${subaccount.name}" has been permanently deleted`);
      handleClose();
      onDeleted();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete subaccount");
    } finally {
      setDeleting(false);
    }
  };

  if (!subaccount) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Subaccount
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Are you sure you want to delete this subaccount?"
              : "Final confirmation required"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning: This action cannot be undone</AlertTitle>
              <AlertDescription>
                Deleting this subaccount will permanently remove:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All blog projects and articles</li>
                  <li>Subscription and billing data</li>
                  <li>User access to this subaccount</li>
                  <li>All associated settings and integrations</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="py-4 space-y-2">
              <Label className="text-muted-foreground">Subaccount to delete:</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{subaccount.name}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  ID: {subaccount.location_id}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleProceedToStep2}>
                I understand, continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Final Warning</AlertTitle>
              <AlertDescription>
                You are about to permanently delete "{subaccount.name}". This
                cannot be recovered.
              </AlertDescription>
            </Alert>

            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-delete">
                  Type <span className="font-bold text-destructive">DELETE</span> to
                  confirm:
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep(1)}>
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Permanently
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

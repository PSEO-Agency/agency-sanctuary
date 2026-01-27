import { FileEdit, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampaignDB } from "@/hooks/useCampaigns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DraftCampaignsBannerProps {
  drafts: CampaignDB[];
  onContinue: (id: string) => void;
  onDiscard: (id: string) => void;
}

const STEP_LABELS = [
  "Business Details",
  "Data Source",
  "Data Entry",
  "Template",
  "Editor",
];

export function DraftCampaignsBanner({ drafts, onContinue, onDiscard }: DraftCampaignsBannerProps) {
  if (drafts.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileEdit className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="font-medium text-amber-900 dark:text-amber-100">
          {drafts.length === 1 ? "1 Unfinished Campaign" : `${drafts.length} Unfinished Campaigns`}
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        {drafts.map((draft) => (
          <div 
            key={draft.id} 
            className="flex items-center gap-3 bg-background rounded-lg px-4 py-3 border shadow-sm"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {draft.name || "Untitled Campaign"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  Step {draft.wizard_step}/5
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {STEP_LABELS[draft.wizard_step - 1]}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={() => onContinue(draft.id)}
                className="gap-1"
              >
                Continue
                <ArrowRight className="h-3 w-3" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Discard Draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the draft campaign "{draft.name || "Untitled Campaign"}". 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDiscard(draft.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Discard
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

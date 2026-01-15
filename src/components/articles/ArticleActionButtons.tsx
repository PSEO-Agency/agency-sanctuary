import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Sparkles, ExternalLink, Eye, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OutlineEditorDialog } from "./OutlineEditorDialog";
import { ResearchViewerDialog } from "./ResearchViewerDialog";
import type { Article } from "./ArticleRow";

interface ArticleActionButtonsProps {
  article: Article;
  baseId: string;
  onStatusChange?: (newStatus: string) => void;
  onArticleUpdate?: (updatedArticle: Article) => void;
  compact?: boolean;
}

// Status transitions and their configurations
const STATUS_CONFIG: Record<string, {
  action: string;
  label: string;
  icon: typeof Eye;
  nextStatus?: string;
  secondaryAction?: string;
  secondaryLabel?: string;
  secondaryIcon?: typeof Eye;
}> = {
  'research done': {
    action: 'view-research',
    label: 'View Research',
    icon: Search,
    secondaryAction: 'generate-outline',
    secondaryLabel: 'Generate Outline',
    nextStatus: 'Generate Outline',
    secondaryIcon: FileText,
  },
  'outline ready': {
    action: 'view-outline',
    label: 'View Outline',
    secondaryAction: 'generate-article',
    secondaryLabel: 'Generate Article',
    nextStatus: 'Generate Article',
    icon: Eye,
    secondaryIcon: Sparkles,
  },
  'article ready': {
    action: 'approve-publish',
    label: 'Approve & Publish',
    icon: ExternalLink,
  },
  'content ready': {
    action: 'approve-publish',
    label: 'Approve & Publish',
    icon: ExternalLink,
  },
};

// Processing statuses that require polling
const POLLING_CONFIG: Record<string, { waitFor: string; label: string }> = {
  'start research': { waitFor: 'research done', label: 'Researching...' },
  'generate outline': { waitFor: 'outline ready', label: 'Generating Outline...' },
  'generate article': { waitFor: 'article ready', label: 'Generating Article...' },
};

export function ArticleActionButtons({
  article,
  baseId,
  onStatusChange,
  onArticleUpdate,
  compact = false
}: ArticleActionButtonsProps) {
  const [currentStatus, setCurrentStatus] = useState(article.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [outlineDialogOpen, setOutlineDialogOpen] = useState(false);
  const [researchDialogOpen, setResearchDialogOpen] = useState(false);
  const [currentOutline, setCurrentOutline] = useState(article.outline);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync status from props
  useEffect(() => {
    setCurrentStatus(article.status);
    setCurrentOutline(article.outline);
  }, [article.status, article.outline]);

  // Get normalized status for comparison
  const normalizedStatus = currentStatus.toLowerCase();

  // Check if currently in a polling state
  const pollingInfo = POLLING_CONFIG[normalizedStatus];

  // Get action config for current status
  const actionConfig = STATUS_CONFIG[normalizedStatus as keyof typeof STATUS_CONFIG];

  // Poll for status changes
  const pollStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-article-status', {
        body: { baseId, recordId: article.id }
      });

      if (error) throw error;

      if (data.success && data.status) {
        const newStatus = data.status;
        const newStatusLower = newStatus.toLowerCase();
        
        // Check if we've reached the target status
        if (pollingInfo && newStatusLower === pollingInfo.waitFor.toLowerCase()) {
          setCurrentStatus(newStatus);
          setIsPolling(false);
          onStatusChange?.(newStatus);
          toast.success(`Status updated to: ${newStatus}`);
          
          // Clear polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (newStatusLower !== normalizedStatus) {
          // Status changed to something else
          setCurrentStatus(newStatus);
          onStatusChange?.(newStatus);
        }
      }
    } catch (err) {
      console.error('Error polling status:', err);
    }
  }, [baseId, article.id, pollingInfo, normalizedStatus, onStatusChange]);

  // Start/stop polling based on status
  useEffect(() => {
    if (pollingInfo && !pollingIntervalRef.current) {
      setIsPolling(true);
      pollingIntervalRef.current = setInterval(pollStatus, 10000);
      // Initial poll
      pollStatus();
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [pollingInfo, pollStatus]);

  // Update status in Airtable
  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-airtable-article', {
        body: {
          baseId,
          recordId: article.id,
          fields: { status: newStatus }
        }
      });

      if (error) throw error;

      if (data.success) {
        setCurrentStatus(newStatus);
        onStatusChange?.(newStatus);
        toast.success(`Status changed to: ${newStatus}`);
      } else {
        throw new Error(data.error || 'Failed to update status');
      }
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast.error(err.message || 'Failed to update status');
    }
    setIsUpdating(false);
  };

  // Handle action button clicks
  const handleAction = (action: string) => {
    switch (action) {
      case 'view-research':
        setResearchDialogOpen(true);
        break;
      case 'generate-outline':
        updateStatus('Generate Outline');
        break;
      case 'view-outline':
        setOutlineDialogOpen(true);
        break;
      case 'generate-article':
        updateStatus('Generate Article');
        break;
      case 'view-article':
        // Already viewing the article, could navigate to editor if on table
        break;
      case 'approve-publish':
        window.open('https://programmaticseo.agency/strategy-call', '_blank');
        break;
    }
  };

  // Handle outline save
  const handleOutlineSaved = (newOutline: string) => {
    setCurrentOutline(newOutline);
    if (onArticleUpdate) {
      onArticleUpdate({ ...article, outline: newOutline });
    }
  };

  // If in a polling state, don't show action button (status badge handles processing indicator)
  if (pollingInfo && isPolling) {
    return null;
  }

  // If no action available for this status, return null
  if (!actionConfig) {
    return null;
  }

  const Icon = actionConfig.icon;
  const SecondaryIcon = 'secondaryIcon' in actionConfig ? actionConfig.secondaryIcon : null;

  return (
    <>
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {/* Primary Action Button */}
        <Button
          variant="default"
          size="sm"
          onClick={() => handleAction(actionConfig.action)}
          disabled={isUpdating}
          className="h-7 px-2.5 text-xs whitespace-nowrap"
        >
          {isUpdating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Icon className="h-3.5 w-3.5 mr-1.5" />
          )}
          {actionConfig.label}
        </Button>

        {/* Secondary Action Button (for outline ready and article ready states) */}
        {'secondaryAction' in actionConfig && actionConfig.secondaryAction && SecondaryIcon && (
          <Button
            variant="default"
            size="sm"
            onClick={() => handleAction(actionConfig.secondaryAction!)}
            disabled={isUpdating}
            className={`h-7 px-2.5 text-xs whitespace-nowrap ${actionConfig.secondaryAction === 'approve-publish' ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {isUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <SecondaryIcon className="h-3.5 w-3.5 mr-1.5" />
            )}
            {actionConfig.secondaryLabel}
          </Button>
        )}
      </div>

      {/* Outline Editor Dialog */}
      <OutlineEditorDialog
        open={outlineDialogOpen}
        onOpenChange={setOutlineDialogOpen}
        outline={currentOutline}
        baseId={baseId}
        recordId={article.id}
        articleName={article.name}
        onSaved={handleOutlineSaved}
      />

      {/* Research Viewer Dialog */}
      <ResearchViewerDialog
        open={researchDialogOpen}
        onOpenChange={setResearchDialogOpen}
        baseId={baseId}
        recordId={article.id}
        articleName={article.name}
      />
    </>
  );
}

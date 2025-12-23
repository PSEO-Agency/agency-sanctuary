import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Check, Circle, Loader2, RefreshCw, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArticleStatusTrackerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseId: string;
  recordId: string;
  articleName: string;
  projectId: string;
  onViewArticle?: () => void;
}

// Known status progression order (will be populated from Airtable)
const DEFAULT_STATUSES = [
  "Start Research",
  "Research in Progress",
  "Research Complete",
  "Generating Outline",
  "Outline Ready",
  "Generating Content",
  "Content Ready",
  "Review",
  "Ready to Publish",
  "Published",
];

export function ArticleStatusTracker({
  open,
  onOpenChange,
  baseId,
  recordId,
  articleName,
  projectId,
  onViewArticle,
}: ArticleStatusTrackerProps) {
  const [currentStatus, setCurrentStatus] = useState<string | null>("Start Research");
  const [statusOptions, setStatusOptions] = useState<string[]>(DEFAULT_STATUSES);
  const [isPolling, setIsPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const POLL_INTERVAL = 5000; // 5 seconds
  const MAX_POLL_COUNT = 60; // 5 minutes max (60 * 5 seconds)

  // Fetch status options from Airtable
  useEffect(() => {
    const fetchStatusOptions = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-airtable-field-options', {
          body: { baseId, tableName: 'pSEO Pages' }
        });

        if (error) throw error;

        if (data?.fields?.Status?.options) {
          // Extract option names in order
          const options = data.fields.Status.options.map((opt: { name: string }) => opt.name);
          if (options.length > 0) {
            setStatusOptions(options);
          }
        }
      } catch (err) {
        console.error('Failed to fetch status options:', err);
        // Keep default statuses
      }
    };

    if (open && baseId) {
      fetchStatusOptions();
    }
  }, [open, baseId]);

  // Poll for status updates
  const pollStatus = useCallback(async () => {
    if (!baseId || !recordId) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-article-status', {
        body: { baseId, recordId }
      });

      if (error) throw error;

      if (data?.success && data?.status) {
        setCurrentStatus(data.status);
        setLastUpdated(new Date());
        setError(null);

        // Check if we've reached a terminal status
        const terminalStatuses = ['Ready to Publish', 'Published', 'Error', 'Cancelled'];
        if (terminalStatuses.includes(data.status)) {
          setIsPolling(false);
        }
      }
    } catch (err: any) {
      console.error('Error polling status:', err);
      setError(err.message || 'Failed to fetch status');
    }

    setPollCount(prev => prev + 1);
  }, [baseId, recordId]);

  // Polling effect
  useEffect(() => {
    if (!open || !isPolling) return;

    // Stop polling after max count
    if (pollCount >= MAX_POLL_COUNT) {
      setIsPolling(false);
      return;
    }

    const interval = setInterval(pollStatus, POLL_INTERVAL);
    
    // Initial poll
    if (pollCount === 0) {
      pollStatus();
    }

    return () => clearInterval(interval);
  }, [open, isPolling, pollCount, pollStatus]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPollCount(0);
      setIsPolling(true);
      setError(null);
      setCurrentStatus("Start Research");
    }
  }, [open]);

  const getStatusIndex = (status: string | null): number => {
    if (!status) return -1;
    return statusOptions.findIndex(s => 
      s.toLowerCase() === status.toLowerCase()
    );
  };

  const currentIndex = getStatusIndex(currentStatus);

  const handleRefresh = () => {
    setPollCount(0);
    setIsPolling(true);
    pollStatus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPolling ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Check className="h-5 w-5 text-green-500" />
            )}
            {isPolling ? "Processing Article" : "Processing Complete"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Article name */}
          <div className="px-4 py-3 bg-muted/50 rounded-lg">
            <p className="font-medium text-sm truncate">{articleName}</p>
          </div>

          {/* Status progression */}
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-1">
              {statusOptions.map((status, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isPending = index > currentIndex;

                return (
                  <div
                    key={status}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md transition-all",
                      isCurrent && "bg-primary/10 border border-primary/20",
                      isCompleted && "opacity-70",
                      isPending && "opacity-40"
                    )}
                  >
                    <div className="flex-shrink-0">
                      {isCompleted && (
                        <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {isCurrent && isPolling && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
                        </div>
                      )}
                      {isCurrent && !isPolling && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      {isPending && (
                        <Circle className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </div>
                    <span className={cn(
                      "text-sm",
                      isCurrent && "font-medium text-foreground",
                      isCompleted && "text-muted-foreground",
                      isPending && "text-muted-foreground/60"
                    )}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Status footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
            <div className="flex items-center gap-2">
              {isPolling ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Updating every 5 seconds...</span>
                </>
              ) : pollCount >= MAX_POLL_COUNT ? (
                <span>Polling stopped after 5 minutes</span>
              ) : (
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              )}
            </div>
            {!isPolling && (
              <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-7 text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            )}
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            {onViewArticle && (
              <Button onClick={onViewArticle}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Article
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

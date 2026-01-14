import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResearchViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseId: string;
  recordId: string;
  articleName: string;
}

type FieldValue = string | number | boolean | string[] | Record<string, unknown> | null | undefined;

interface NeuronwriterField {
  name: string;
  displayName: string;
  value: FieldValue;
}

function formatFieldName(name: string): string {
  return name
    .replace(/^neuronwriter[_\s]*/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatFieldValue(value: FieldValue): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

export function ResearchViewerDialog({
  open,
  onOpenChange,
  baseId,
  recordId,
  articleName
}: ResearchViewerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<NeuronwriterField[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchResearchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-article-status', {
        body: { baseId, recordId }
      });

      if (fetchError) throw fetchError;

      if (data.success && data.record?.fields) {
        // Filter fields that start with "neuronwriter" (case-insensitive)
        const neuronwriterFields = Object.entries(data.record.fields)
          .filter(([key]) => key.toLowerCase().startsWith('neuronwriter'))
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([key, value]) => ({
            name: key,
            displayName: formatFieldName(key),
            value: value as FieldValue
          }));

        setFields(neuronwriterFields);
      } else {
        throw new Error('Failed to fetch research data');
      }
    } catch (err: unknown) {
      console.error('Error fetching research data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load research data');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && baseId && recordId) {
      fetchResearchData();
    }
  }, [open, baseId, recordId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg">
                Research Data: {articleName}
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchResearchData}
              disabled={loading}
              className="h-8 px-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
                <Button variant="outline" onClick={fetchResearchData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : fields.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No Neuronwriter research data found for this article.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {fields.map((field) => (
                  <Card key={field.name} className="overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-muted/30">
                      <CardTitle className="text-sm font-medium text-foreground">
                        {field.displayName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans break-words">
                        {formatFieldValue(field.value)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

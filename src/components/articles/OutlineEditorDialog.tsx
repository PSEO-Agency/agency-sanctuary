import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save, X, List, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OutlineEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outline: string;
  baseId: string;
  recordId: string;
  articleName: string;
  onSaved?: (newOutline: string) => void;
}

function parseOutline(outline: string) {
  if (!outline) return [];
  
  const lines = outline.split('\n').filter(line => line.trim());
  const items: { level: number; text: string }[] = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    let level = 0;
    let text = trimmed;
    
    if (trimmed.startsWith('### ')) {
      level = 2;
      text = trimmed.replace('### ', '');
    } else if (trimmed.startsWith('## ')) {
      level = 1;
      text = trimmed.replace('## ', '');
    } else if (trimmed.startsWith('# ')) {
      level = 0;
      text = trimmed.replace('# ', '');
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      level = 3;
      text = trimmed.replace(/^[-*] /, '');
    }
    
    if (text) {
      items.push({ level, text });
    }
  });
  
  return items;
}

export function OutlineEditorDialog({
  open,
  onOpenChange,
  outline,
  baseId,
  recordId,
  articleName,
  onSaved
}: OutlineEditorDialogProps) {
  const [editedOutline, setEditedOutline] = useState(outline);
  const [originalOutline, setOriginalOutline] = useState(outline);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Fetch the latest outline from Airtable when dialog opens
  useEffect(() => {
    if (open && baseId && recordId) {
      fetchOutlineFromAirtable();
    }
  }, [open, baseId, recordId]);

  const fetchOutlineFromAirtable = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-article-status', {
        body: { baseId, recordId }
      });

      if (error) throw error;

      if (data.success && data.record?.fields) {
        // Get SEO Outline from the Airtable record
        const seoOutline = data.record.fields['SEO Outline'] || data.record.fields['Outline'] || '';
        setEditedOutline(seoOutline);
        setOriginalOutline(seoOutline);
      }
    } catch (err) {
      console.error('Error fetching outline:', err);
      // Fallback to the prop value
      setEditedOutline(outline);
      setOriginalOutline(outline);
    }
    setLoading(false);
  };

  const outlineItems = parseOutline(editedOutline);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-airtable-article', {
        body: {
          baseId,
          recordId,
          fields: { outline: editedOutline }
        }
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success("Outline saved successfully");
        onSaved?.(editedOutline);
        onOpenChange(false);
      } else {
        throw new Error(data.error || "Failed to save outline");
      }
    } catch (err: any) {
      console.error("Error saving outline:", err);
      toast.error(err.message || "Failed to save outline");
    }
    setSaving(false);
  };

  const hasChanges = editedOutline !== originalOutline;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg">
            Edit Outline: {articleName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Editor Panel */}
          <div className="flex-1 flex flex-col border-r">
            <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Markdown Editor
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchOutlineFromAirtable}
                disabled={loading}
                className="h-6 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex-1 p-4">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Textarea
                  value={editedOutline}
                  onChange={(e) => setEditedOutline(e.target.value)}
                  placeholder="# Main Topic&#10;## Section 1&#10;### Subsection&#10;- Point 1&#10;- Point 2"
                  className="h-full resize-none font-mono text-sm"
                />
              )}
            </div>
          </div>
          
          {/* Preview Panel */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-2 border-b bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Preview
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                {outlineItems.length > 0 ? (
                  <div className="space-y-1">
                    {outlineItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 py-1"
                        style={{ paddingLeft: `${item.level * 16}px` }}
                      >
                        <List className="h-3 w-3 mt-1.5 text-muted-foreground shrink-0" />
                        <span className={`text-sm ${
                          item.level === 0 
                            ? 'font-bold text-foreground' 
                            : item.level === 1 
                              ? 'font-semibold text-foreground' 
                              : item.level === 2
                                ? 'font-medium text-foreground'
                                : 'text-muted-foreground'
                        }`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Start typing to see the outline preview
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Outline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, List } from "lucide-react";

interface ArticleOutlinePanelProps {
  outline: string;
  setOutline: (value: string) => void;
}

function parseOutline(outline: string) {
  if (!outline) return [];
  
  const lines = outline.split('\n').filter(line => line.trim());
  const items: { level: number; text: string }[] = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    let level = 0;
    let text = trimmed;
    
    // Detect heading levels
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

export function ArticleOutlinePanel({ outline, setOutline }: ArticleOutlinePanelProps) {
  const outlineItems = parseOutline(outline);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="h-4 w-4" />
          SEO Outline
        </div>

        {outlineItems.length > 0 ? (
          <div className="space-y-1">
            {outlineItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 py-1"
                style={{ paddingLeft: `${item.level * 12}px` }}
              >
                <List className="h-3 w-3 mt-1 text-muted-foreground shrink-0" />
                <span className={`text-sm ${item.level === 0 ? 'font-semibold' : item.level === 1 ? 'font-medium' : 'text-muted-foreground'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No outline available</p>
        )}

        <div className="pt-4 border-t">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
            Edit Outline
          </label>
          <Textarea
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
            placeholder="# Main Topic&#10;## Section 1&#10;### Subsection&#10;- Point 1&#10;- Point 2"
            className="min-h-[200px] font-mono text-xs"
          />
        </div>
      </div>
    </ScrollArea>
  );
}

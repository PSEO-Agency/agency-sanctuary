import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  type: 'h2' | 'h3' | 'paragraph' | 'list';
  content: string;
}

interface ArticleSectionsEditorProps {
  content: string;
  setContent: (value: string) => void;
}

function parseContentToSections(content: string): Section[] {
  if (!content) return [];
  
  const sections: Section[] = [];
  const lines = content.split('\n');
  let currentParagraph = '';
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('## ')) {
      if (currentParagraph) {
        sections.push({
          id: `p-${sections.length}`,
          type: 'paragraph',
          content: currentParagraph.trim()
        });
        currentParagraph = '';
      }
      sections.push({
        id: `h2-${index}`,
        type: 'h2',
        content: trimmedLine.replace('## ', '')
      });
    } else if (trimmedLine.startsWith('### ')) {
      if (currentParagraph) {
        sections.push({
          id: `p-${sections.length}`,
          type: 'paragraph',
          content: currentParagraph.trim()
        });
        currentParagraph = '';
      }
      sections.push({
        id: `h3-${index}`,
        type: 'h3',
        content: trimmedLine.replace('### ', '')
      });
    } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      if (currentParagraph) {
        sections.push({
          id: `p-${sections.length}`,
          type: 'paragraph',
          content: currentParagraph.trim()
        });
        currentParagraph = '';
      }
      sections.push({
        id: `list-${index}`,
        type: 'list',
        content: trimmedLine
      });
    } else if (trimmedLine) {
      currentParagraph += line + '\n';
    }
  });
  
  if (currentParagraph) {
    sections.push({
      id: `p-${sections.length}`,
      type: 'paragraph',
      content: currentParagraph.trim()
    });
  }
  
  return sections;
}

function sectionsToContent(sections: Section[]): string {
  return sections.map(section => {
    switch (section.type) {
      case 'h2':
        return `## ${section.content}`;
      case 'h3':
        return `### ${section.content}`;
      case 'list':
        return section.content;
      default:
        return section.content;
    }
  }).join('\n\n');
}

export function ArticleSectionsEditor({ content, setContent }: ArticleSectionsEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  const sections = useMemo(() => parseContentToSections(content), [content]);
  
  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const updateSection = (id: string, newContent: string) => {
    const newSections = sections.map(s => 
      s.id === id ? { ...s, content: newContent } : s
    );
    setContent(sectionsToContent(newSections));
  };

  const deleteSection = (id: string) => {
    const newSections = sections.filter(s => s.id !== id);
    setContent(sectionsToContent(newSections));
  };

  const addSection = (afterId: string, type: Section['type']) => {
    const index = sections.findIndex(s => s.id === afterId);
    const newSection: Section = {
      id: `new-${Date.now()}`,
      type,
      content: type === 'h2' ? 'New Heading' : type === 'h3' ? 'New Subheading' : 'New paragraph...'
    };
    const newSections = [
      ...sections.slice(0, index + 1),
      newSection,
      ...sections.slice(index + 1)
    ];
    setContent(sectionsToContent(newSections));
    setEditingId(newSection.id);
  };

  if (sections.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">No content sections found</p>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your content here..."
          className="min-h-[400px] font-mono"
        />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-2">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={cn(
              "group border rounded-lg bg-background transition-all",
              editingId === section.id && "ring-2 ring-primary"
            )}
          >
            {/* Section Header */}
            <div 
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection(section.id)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
              
              {section.type === 'h2' || section.type === 'h3' || section.type === 'paragraph' ? (
                expandedSections.has(section.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )
              ) : (
                <div className="w-4" />
              )}
              
              <div className="flex-1 min-w-0">
                {section.type === 'h2' && (
                  <span className="font-semibold text-base truncate block">
                    {section.content}
                  </span>
                )}
                {section.type === 'h3' && (
                  <span className="font-medium text-sm truncate block pl-4">
                    {section.content}
                  </span>
                )}
                {section.type === 'paragraph' && (
                  <span className="text-sm text-muted-foreground truncate block">
                    {section.content.substring(0, 80)}...
                  </span>
                )}
                {section.type === 'list' && (
                  <span className="text-sm text-muted-foreground">
                    {section.content}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(editingId === section.id ? null : section.id);
                    if (!expandedSections.has(section.id)) {
                      toggleSection(section.id);
                    }
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSection(section.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedSections.has(section.id) && (
              <div className="px-3 pb-3 pl-10">
                {editingId === section.id ? (
                  <Textarea
                    value={section.content}
                    onChange={(e) => updateSection(section.id, e.target.value)}
                    className="min-h-[100px] text-sm"
                    autoFocus
                    onBlur={() => setEditingId(null)}
                  />
                ) : (
                  <div 
                    className="text-sm text-muted-foreground whitespace-pre-wrap cursor-text hover:bg-muted/30 rounded p-2 -m-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(section.id);
                    }}
                  >
                    {section.content}
                  </div>
                )}
              </div>
            )}

            {/* Add Section Button */}
            {index === sections.length - 1 && (
              <div className="border-t px-3 py-2 flex items-center gap-2 opacity-0 group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addSection(section.id, 'h2')}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Heading
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addSection(section.id, 'h3')}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Subheading
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addSection(section.id, 'paragraph')}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Paragraph
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

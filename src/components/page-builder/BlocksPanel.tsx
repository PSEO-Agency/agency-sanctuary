import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  PanelLeftClose, 
  PanelLeft,
  Layout,
  Grid3x3,
  FileText,
  MousePointerClick,
  HelpCircle,
  Quote,
  Plus,
  GripVertical,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCK_DEFINITIONS, BlockDefinition } from "./types";
import { TemplateSection } from "@/lib/campaignTemplates";

interface BlocksPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onAddBlock: (block: BlockDefinition) => void;
  sections: TemplateSection[];
  onSelectSection?: (sectionId: string) => void;
  selectedSection?: string | null;
  onReorderSections?: (sections: TemplateSection[]) => void;
  onDeleteSection?: (sectionId: string) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Layout,
  Grid3x3,
  FileText,
  MousePointerClick,
  HelpCircle,
  Quote,
};

export function BlocksPanel({
  isOpen,
  onToggle,
  onAddBlock,
  sections,
  onSelectSection,
  selectedSection,
  onReorderSections,
  onDeleteSection,
}: BlocksPanelProps) {
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (sectionId !== draggedSection) {
      setDragOverSection(sectionId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === targetId) return;
    
    const reordered = [...sections];
    const fromIndex = reordered.findIndex(s => s.id === draggedSection);
    const toIndex = reordered.findIndex(s => s.id === targetId);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    
    onReorderSections?.(reordered);
    setDraggedSection(null);
    setDragOverSection(null);
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
    setDragOverSection(null);
  };

  return (
    <div
      className={cn(
        "border-r bg-background flex flex-col transition-all duration-300 ease-in-out flex-shrink-0",
        isOpen ? "w-[260px]" : "w-12"
      )}
    >
      {/* Toggle Header */}
      <div className="flex items-center justify-between p-3 border-b">
        {isOpen && (
          <span className="text-sm font-medium text-foreground">Blocks</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggle}
        >
          {isOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isOpen && (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Current Sections */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Page Sections
              </h4>
              <div className="space-y-1">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, section.id)}
                    onDragOver={(e) => handleDragOver(e, section.id)}
                    onDrop={(e) => handleDrop(e, section.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectSection?.(section.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors cursor-pointer group",
                      selectedSection === section.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted text-foreground",
                      draggedSection === section.id && "opacity-50",
                      dragOverSection === section.id && "ring-2 ring-primary ring-offset-1"
                    )}
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0" />
                    <span className="flex-1 truncate">{section.name}</span>
                    {onDeleteSection && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSection(section.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Blocks */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Add Block
              </h4>
              <div className="space-y-1">
                {BLOCK_DEFINITIONS.map((block) => {
                  const Icon = iconMap[block.icon] || Layout;
                  return (
                    <button
                      key={block.id}
                      onClick={() => onAddBlock(block)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left hover:bg-muted transition-colors group border border-transparent hover:border-border"
                    >
                      <div className="p-1.5 rounded bg-muted group-hover:bg-primary/10">
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{block.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{block.description}</p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

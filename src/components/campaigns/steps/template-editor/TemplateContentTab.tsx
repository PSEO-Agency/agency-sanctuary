import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TemplateSection } from "@/lib/campaignTemplates";
import { ChevronDown, ChevronRight, Plus, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateContentTabProps {
  sections: TemplateSection[];
  onUpdateSection: (sectionId: string, field: string, value: string | string[]) => void;
  sampleData: Record<string, string>;
}

export function TemplateContentTab({ sections, onUpdateSection, sampleData }: TemplateContentTabProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(sections.map(s => s.id));

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Replace placeholders with sample data for preview
  const resolvePlaceholder = (text: string): string => {
    let resolved = text;
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
      resolved = resolved.replace(regex, value);
    });
    return resolved;
  };

  // Check if value is a prompt
  const isPrompt = (value: string): boolean => {
    return value.startsWith('prompt("') || value.startsWith("prompt('");
  };

  // Extract prompt content
  const getPromptContent = (value: string): string => {
    const match = value.match(/prompt\(["'](.*)["']\)/);
    return match ? match[1] : value;
  };

  const renderFieldEditor = (section: TemplateSection, field: string, value: string | string[]) => {
    if (Array.isArray(value)) {
      return (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground capitalize">{field.replace(/_/g, " ")}</Label>
          <div className="space-y-2">
            {value.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                <Input
                  value={item}
                  onChange={(e) => {
                    const newItems = [...value];
                    newItems[index] = e.target.value;
                    onUpdateSection(section.id, field, newItems);
                  }}
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    const newItems = value.filter((_, i) => i !== index);
                    onUpdateSection(section.id, field, newItems);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1"
              onClick={() => {
                onUpdateSection(section.id, field, [...value, ""]);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>
        </div>
      );
    }

    const stringValue = value as string;
    const isPromptField = isPrompt(stringValue);
    const displayValue = isPromptField ? getPromptContent(stringValue) : stringValue;

    // Long text fields
    if (field === "body" || field === "description" || field === "subheadline") {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground capitalize">{field.replace(/_/g, " ")}</Label>
            {isPromptField && (
              <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">AI Prompt</span>
            )}
          </div>
          <Textarea
            value={displayValue}
            onChange={(e) => {
              const newValue = isPromptField ? `prompt("${e.target.value}")` : e.target.value;
              onUpdateSection(section.id, field, newValue);
            }}
            className="text-sm min-h-[80px] resize-none"
            placeholder={isPromptField ? "Enter AI prompt..." : "Enter content..."}
          />
          {isPromptField && (
            <p className="text-[10px] text-muted-foreground">
              Preview: {resolvePlaceholder(displayValue).substring(0, 100)}...
            </p>
          )}
        </div>
      );
    }

    // Short text fields
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground capitalize">{field.replace(/_/g, " ")}</Label>
        <Input
          value={displayValue}
          onChange={(e) => {
            const newValue = isPromptField ? `prompt("${e.target.value}")` : e.target.value;
            onUpdateSection(section.id, field, newValue);
          }}
          className="h-9 text-sm"
          placeholder={`Enter ${field.replace(/_/g, " ")}...`}
        />
        {stringValue.includes("{{") && (
          <p className="text-[10px] text-muted-foreground">
            Preview: {resolvePlaceholder(displayValue)}
          </p>
        )}
      </div>
    );
  };

  const getSectionIcon = (type: string) => {
    const icons: Record<string, string> = {
      hero: "🏠",
      features: "✨",
      content: "📝",
      cta: "🎯",
      faq: "❓",
      testimonials: "💬",
      gallery: "🖼️",
      footer: "📌",
    };
    return icons[type] || "📄";
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium mb-4">Page Sections</div>
      
      {sections.map((section) => {
        const isExpanded = expandedSections.includes(section.id);
        
        return (
          <Collapsible
            key={section.id}
            open={isExpanded}
            onOpenChange={() => toggleSection(section.id)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 h-10 px-3",
                  isExpanded && "bg-muted"
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>{getSectionIcon(section.type)}</span>
                <span className="font-medium">{section.name}</span>
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="pl-4 pr-2 py-3 space-y-4 border-l-2 border-muted ml-5">
                {Object.entries(section.content).map(([field, value]) => (
                  <div key={field}>
                    {renderFieldEditor(section, field, value)}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

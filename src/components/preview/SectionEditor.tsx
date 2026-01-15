import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit2,
  Check,
  X,
  Plus,
  Sparkles,
} from "lucide-react";
import { SectionContent, FieldContent } from "@/hooks/useCampaignPages";
import { cn } from "@/lib/utils";

interface SectionEditorProps {
  sections: SectionContent[];
  onSectionsChange: (sections: SectionContent[]) => void;
  dataValues: Record<string, string>;
}

export function SectionEditor({
  sections,
  onSectionsChange,
  dataValues,
}: SectionEditorProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ sectionId: string; fieldName: string } | null>(null);
  const [fieldValue, setFieldValue] = useState("");

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    onSectionsChange(newSections);
  };

  const deleteSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    onSectionsChange(newSections);
  };

  const startEditingField = (sectionId: string, fieldName: string, currentValue: string) => {
    setEditingField({ sectionId, fieldName });
    setFieldValue(currentValue);
  };

  const saveFieldEdit = () => {
    if (!editingField) return;
    
    const newSections = sections.map(section => {
      if (section.id === editingField.sectionId && section.fields?.[editingField.fieldName]) {
        return {
          ...section,
          fields: {
            ...section.fields,
            [editingField.fieldName]: {
              ...section.fields[editingField.fieldName],
              rendered: fieldValue,
              generated: fieldValue,
            },
          },
        };
      }
      return section;
    });
    
    onSectionsChange(newSections);
    setEditingField(null);
    setFieldValue("");
  };

  const cancelFieldEdit = () => {
    setEditingField(null);
    setFieldValue("");
  };

  const getSectionTypeIcon = (type: string) => {
    switch (type) {
      case "hero":
        return "🎯";
      case "features":
        return "✨";
      case "content":
        return "📝";
      case "cta":
        return "🚀";
      case "faq":
        return "❓";
      case "testimonials":
        return "💬";
      case "gallery":
        return "🖼️";
      default:
        return "📄";
    }
  };

  const getFieldDisplayValue = (field: FieldContent): string => {
    if (field.generated) return field.generated;
    if (field.rendered) return field.rendered;
    return field.original;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Page Sections</Label>
        <Badge variant="secondary">{sections.length} sections</Badge>
      </div>

      <div className="space-y-3">
        {sections.map((section, index) => (
          <Card 
            key={section.id} 
            className={cn(
              "transition-all",
              editingSection === section.id && "ring-2 ring-primary"
            )}
          >
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="cursor-grab text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <span className="text-lg">{getSectionTypeIcon(section.type)}</span>
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {section.name || section.id}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground capitalize">{section.type}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {section.generated && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveSection(index, "up")}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveSection(index, "down")}
                    disabled={index === sections.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditingSection(
                      editingSection === section.id ? null : section.id
                    )}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteSection(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {editingSection === section.id && section.fields && (
              <CardContent className="pt-0 pb-4 px-4 space-y-4">
                {Object.entries(section.fields).map(([fieldName, field]) => {
                  const isEditing = 
                    editingField?.sectionId === section.id && 
                    editingField?.fieldName === fieldName;
                  const displayValue = getFieldDisplayValue(field);

                  return (
                    <div key={fieldName} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium capitalize">
                          {fieldName.replace(/_/g, " ")}
                        </Label>
                        {field.isPrompt && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-2">
                          {displayValue.length > 100 ? (
                            <Textarea
                              value={fieldValue}
                              onChange={(e) => setFieldValue(e.target.value)}
                              className="min-h-[100px] text-sm"
                            />
                          ) : (
                            <Input
                              value={fieldValue}
                              onChange={(e) => setFieldValue(e.target.value)}
                              className="text-sm"
                            />
                          )}
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelFieldEdit}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveFieldEdit}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditingField(section.id, fieldName, displayValue)}
                          className="p-3 bg-muted/50 rounded-lg text-sm cursor-pointer hover:bg-muted transition-colors"
                        >
                          <p className="line-clamp-3 text-muted-foreground">
                            {displayValue || <span className="italic">Click to edit...</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {sections.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No sections yet. Generate content to create sections.</p>
        </div>
      )}
    </div>
  );
}

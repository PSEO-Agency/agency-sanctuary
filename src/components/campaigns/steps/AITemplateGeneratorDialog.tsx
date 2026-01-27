import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, RotateCcw, Check, Tags, ChevronRight, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { CampaignFormData, Entity, DynamicColumn, TemplateContentConfig } from "../types";
import { toast } from "sonner";

interface AITemplateGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
  onComplete: () => void;
}

interface GeneratedSection {
  id: string;
  type: string;
  name: string;
  content: Record<string, string>;
}

interface GeneratedTemplate {
  sections: GeneratedSection[];
  style: {
    primaryColor: string;
    backgroundColor: string;
    typography: string;
    buttonStyle: "rounded" | "square";
    buttonFill: "solid" | "outline" | "ghost";
    darkMode: boolean;
  };
  images: {
    sectionImages: Array<{ id: string; url: string }>;
  };
}

export function AITemplateGeneratorDialog({
  open,
  onOpenChange,
  formData,
  updateFormData,
  onComplete,
}: AITemplateGeneratorDialogProps) {
  const [currentEntityIndex, setCurrentEntityIndex] = useState(0);
  const [generatedTemplates, setGeneratedTemplates] = useState<Record<string, GeneratedTemplate>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<"idle" | "generating" | "reviewing" | "complete">("idle");
  const [error, setError] = useState<string | null>(null);

  // Get entities from formData - if none, create a default one
  const entities: Entity[] = formData.entities?.length > 0 
    ? formData.entities 
    : [{ id: "default", name: "Main Pages", urlPrefix: "/" }];
  
  const currentEntity = entities[currentEntityIndex];

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentEntityIndex(0);
      setGeneratedTemplates({});
      setGenerationStatus("idle");
      setError(null);
    }
  }, [open]);

  // Generate template for current entity
  const generateTemplate = async () => {
    if (!currentEntity) return;
    
    setIsGenerating(true);
    setGenerationStatus("generating");
    setError(null);

    try {
      const response = await supabase.functions.invoke("generate-template-ai", {
        body: {
          business_name: formData.businessName || "Business",
          business_type: formData.businessType || "local",
          entity: currentEntity,
          variables: formData.dynamicColumns.map((c) => c.variableName),
          existing_data: formData.scratchData,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate template");
      }

      if (response.data?.success && response.data?.template) {
        setGeneratedTemplates((prev) => ({
          ...prev,
          [currentEntity.id]: response.data.template,
        }));
        setGenerationStatus("reviewing");
      } else {
        throw new Error(response.data?.error || "No template generated");
      }
    } catch (err) {
      console.error("Template generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate template");
      setGenerationStatus("idle");
      toast.error("Failed to generate template. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Approve and move to next entity
  const handleApprove = () => {
    if (currentEntityIndex < entities.length - 1) {
      setCurrentEntityIndex((prev) => prev + 1);
      setGenerationStatus("idle");
    } else {
      // All entities approved - save to form data
      const entityTemplates: Record<string, TemplateContentConfig> = {};
      
      Object.entries(generatedTemplates).forEach(([entityId, template]) => {
        entityTemplates[entityId] = {
          sections: template.sections,
          style: template.style,
          images: template.images,
        };
      });

      updateFormData({ entityTemplates });
      onComplete();
    }
  };

  // Skip current entity
  const handleSkip = () => {
    if (currentEntityIndex < entities.length - 1) {
      setCurrentEntityIndex((prev) => prev + 1);
      setGenerationStatus("idle");
    } else {
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Template Generator
          </DialogTitle>
          <DialogDescription>
            Creating custom templates for each entity type in your campaign
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-4">
          {entities.map((entity, idx) => (
            <div
              key={entity.id}
              className={cn(
                "flex-1 h-2 rounded-full transition-colors",
                idx < currentEntityIndex
                  ? "bg-green-500"
                  : idx === currentEntityIndex
                  ? "bg-primary"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Current entity info */}
        {currentEntity && (
          <div className="bg-muted/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <Tags className="h-4 w-4 text-primary" />
              <span className="font-semibold">{currentEntity.name}</span>
              <span className="text-xs text-muted-foreground font-mono">
                ({currentEntity.urlPrefix})
              </span>
              <Badge variant="outline" className="ml-auto">
                {currentEntityIndex + 1}/{entities.length}
              </Badge>
            </div>
          </div>
        )}

        {/* Generation status: idle */}
        {generationStatus === "idle" && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <LayoutTemplate className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Ready to Generate</h3>
              <p className="text-muted-foreground text-sm mt-1">
                AI will create a custom template structure for {currentEntity?.name || "your pages"}
              </p>
            </div>
            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
            <Button onClick={generateTemplate} size="lg" className="mt-4">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Template for {currentEntity?.name}
            </Button>
          </div>
        )}

        {/* Generation status: generating */}
        {generationStatus === "generating" && (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <h3 className="font-semibold text-lg">Generating Template</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Creating sections, prompts, and content structure...
              </p>
            </div>
          </div>
        )}

        {/* Generation status: reviewing */}
        {generationStatus === "reviewing" && generatedTemplates[currentEntity?.id] && (
          <TemplatePreview
            template={generatedTemplates[currentEntity.id]}
            entity={currentEntity}
            variables={formData.dynamicColumns}
          />
        )}

        {/* Action buttons */}
        {generationStatus === "reviewing" && (
          <div className="flex justify-between gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
              Skip
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={generateTemplate} disabled={isGenerating}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button onClick={handleApprove}>
                <Check className="h-4 w-4 mr-2" />
                {currentEntityIndex < entities.length - 1 ? "Approve & Next" : "Approve & Finish"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Template preview component
interface TemplatePreviewProps {
  template: GeneratedTemplate;
  entity: Entity;
  variables: DynamicColumn[];
}

function TemplatePreview({ template, entity, variables }: TemplatePreviewProps) {
  return (
    <div className="space-y-6">
      {/* Sections grid */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Generated Sections</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {template.sections.map((section) => (
            <div
              key={section.id}
              className="border rounded-lg p-3 text-center bg-muted/20"
            >
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {section.type}
              </div>
              <div className="font-medium text-sm mt-1">{section.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Variables used */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Variables Used</h4>
        <div className="flex flex-wrap gap-2">
          {variables.map((v) => (
            <Badge key={v.id} variant="secondary" className="font-mono text-xs">
              {`{{${v.variableName}}}`}
            </Badge>
          ))}
          <Badge variant="secondary" className="font-mono text-xs">
            {`{{company}}`}
          </Badge>
        </div>
      </div>

      {/* Content preview */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Content Preview</h4>
        <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
          {template.sections.map((section) => (
            <div key={section.id} className="p-3">
              <div className="text-xs text-primary font-medium mb-2">
                {section.name}
              </div>
              <div className="space-y-1">
                {Object.entries(section.content).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="text-sm flex gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-20 truncate">
                      {key}:
                    </span>
                    <span className="text-muted-foreground truncate">
                      {String(value).substring(0, 80)}
                      {String(value).length > 80 ? "..." : ""}
                    </span>
                  </div>
                ))}
                {Object.keys(section.content).length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{Object.keys(section.content).length - 3} more fields
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

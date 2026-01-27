import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, RotateCcw, Check, Tags, LayoutTemplate, AlertCircle, Pencil, X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { CampaignFormData, Entity, DynamicColumn, TemplateContentConfig } from "../types";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Example prompt templates for quick selection
const EXAMPLE_PROMPTS = [
  {
    id: "local-service",
    name: "Local Service",
    icon: "🏢",
    prompt: "Create a professional service page with a hero showcasing the main service, features grid with benefits, service area coverage, testimonials from local customers, and a strong call-to-action for booking or getting a quote",
  },
  {
    id: "product-breeds",
    name: "Product/Breeds",
    icon: "🐾",
    prompt: "Generate a hero with title and description, an image placeholder section, feature cards highlighting key characteristics, a pricing or cost range section, pros and cons comparison, FAQ section, and inquiry CTAs for contacting or submitting a form",
  },
  {
    id: "directory",
    name: "Directory Listing",
    icon: "📋",
    prompt: "Build a directory-style page with hero, key details presented in a grid format, contact information section, related services or items, and a contact form call-to-action",
  },
  {
    id: "comparison",
    name: "Comparison",
    icon: "⚖️",
    prompt: "Create a comparison page with hero, side-by-side feature comparison grid, detailed breakdown section with benefits, expert recommendations, and decision-driving CTAs",
  },
  {
    id: "location",
    name: "Location Page",
    icon: "📍",
    prompt: "Design a location-focused page with hero featuring the area name, local benefits and services grid, coverage details, local customer testimonials, and contact CTA with area-specific information",
  },
];

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
  content: Record<string, string | string[]>;
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
  const [userPrompt, setUserPrompt] = useState("");
  
  // State for selected variables
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);

  // Get entities from formData - if none, create a default one
  const entities: Entity[] = formData.entities?.length > 0 
    ? formData.entities 
    : [{ id: "default", name: "Main Pages", urlPrefix: "/" }];
  
  const currentEntity = entities[currentEntityIndex];

  // Restore state from formData when dialog opens (for resume capability)
  useEffect(() => {
    if (open) {
      // Restore previously generated templates from formData
      const existingTemplates: Record<string, GeneratedTemplate> = {};
      Object.entries(formData.entityTemplates || {}).forEach(([entityId, template]) => {
        existingTemplates[entityId] = {
          sections: template.sections as GeneratedSection[],
          style: template.style || {
            primaryColor: "#6366f1",
            backgroundColor: "#ffffff",
            typography: "Inter",
            buttonStyle: "rounded" as const,
            buttonFill: "solid" as const,
            darkMode: false,
          },
          images: template.images || { sectionImages: [] },
        };
      });
      setGeneratedTemplates(existingTemplates);
      
      // Find first entity without a template
      const firstIncompleteIndex = entities.findIndex(
        entity => !formData.entityTemplates?.[entity.id]
      );
      const targetIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
      setCurrentEntityIndex(targetIndex);
      
      // Set status based on whether current entity has template
      const targetEntity = entities[targetIndex];
      if (targetEntity && formData.entityTemplates?.[targetEntity.id]) {
        setGenerationStatus("reviewing");
      } else {
        setGenerationStatus("idle");
      }
      
      // Initialize selected variables with all variables selected
      setSelectedVariables(formData.dynamicColumns.map(c => c.variableName));
      
      setError(null);
      setUserPrompt("");
    }
  }, [open, entities, formData.entityTemplates, formData.dynamicColumns]);

  // Toggle variable selection
  const toggleVariable = (varName: string) => {
    setSelectedVariables(prev => 
      prev.includes(varName)
        ? prev.filter(v => v !== varName)
        : [...prev, varName]
    );
  };

  // Update template in state
  const handleTemplateUpdate = (updatedTemplate: GeneratedTemplate) => {
    if (!currentEntity) return;
    
    setGeneratedTemplates(prev => ({
      ...prev,
      [currentEntity.id]: updatedTemplate,
    }));
    
    // Also update formData for persistence
    const updatedEntityTemplates = {
      ...formData.entityTemplates,
      [currentEntity.id]: {
        sections: updatedTemplate.sections,
        style: updatedTemplate.style,
        images: updatedTemplate.images,
      },
    };
    updateFormData({ entityTemplates: updatedEntityTemplates });
  };

  // Generate template for current entity
  const generateTemplate = async () => {
    if (!currentEntity) return;
    
    if (selectedVariables.length === 0) {
      toast.error("Please select at least one variable to use in the template");
      return;
    }
    
    setIsGenerating(true);
    setGenerationStatus("generating");
    setError(null);

    try {
      const response = await supabase.functions.invoke("generate-template-ai", {
        body: {
          business_name: formData.businessName || "Business",
          business_type: formData.businessType || "local",
          entity: currentEntity,
          variables: selectedVariables,
          existing_data: formData.scratchData,
          user_prompt: userPrompt || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate template");
      }

      if (response.data?.success && response.data?.template) {
        const newTemplates = {
          ...generatedTemplates,
          [currentEntity.id]: response.data.template,
        };
        setGeneratedTemplates(newTemplates);
        setGenerationStatus("reviewing");
        
        // Immediately persist to formData (will trigger auto-save)
        const updatedEntityTemplates = {
          ...formData.entityTemplates,
          [currentEntity.id]: {
            sections: response.data.template.sections,
            style: response.data.template.style,
            images: response.data.template.images,
          },
        };
        updateFormData({ entityTemplates: updatedEntityTemplates });
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
    // Get current entity's template
    const currentTemplate = generatedTemplates[currentEntity?.id];
    
    if (currentTemplate) {
      // Check for empty sections - block progress if any section has no content
      const emptySections = currentTemplate.sections.filter(
        s => !s.content || Object.keys(s.content).length === 0 ||
          Object.values(s.content).every(v => 
            v === "" || (Array.isArray(v) && v.length === 0)
          )
      );
      
      if (emptySections.length > 0) {
        toast.error(`Cannot proceed: ${emptySections.length} section(s) have no content. Please edit or remove empty sections.`);
        return;
      }
      
      // Sync this entity's template to formData
      const updatedEntityTemplates = {
        ...formData.entityTemplates,
        [currentEntity.id]: {
          sections: currentTemplate.sections,
          style: currentTemplate.style,
          images: currentTemplate.images,
        },
      };
      updateFormData({ entityTemplates: updatedEntityTemplates });
    }
    
    if (currentEntityIndex < entities.length - 1) {
      setCurrentEntityIndex((prev) => prev + 1);
      setGenerationStatus("idle");
      setUserPrompt(""); // Clear prompt for next entity
      // Reset selected variables for next entity
      setSelectedVariables(formData.dynamicColumns.map(c => c.variableName));
    } else {
      // All entities done
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
          <div className="py-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <LayoutTemplate className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Ready to Generate</h3>
              <p className="text-muted-foreground text-sm mt-1">
                AI will create a custom template structure for {currentEntity?.name || "your pages"}
              </p>
            </div>

            {/* Variable Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Variables to Use</Label>
              <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                {formData.dynamicColumns.map((col) => {
                  const isSelected = selectedVariables.includes(col.variableName);
                  const samples = (formData.scratchData?.[col.id] || []).slice(0, 3);
                  return (
                    <div
                      key={col.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors",
                        isSelected && "bg-primary/10 border border-primary/20"
                      )}
                      onClick={() => toggleVariable(col.variableName)}
                    >
                      <Checkbox 
                        checked={isSelected} 
                        onCheckedChange={() => toggleVariable(col.variableName)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Badge variant="secondary" className="font-mono text-xs">
                        {`{{${col.variableName}}}`}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex-1 truncate">
                        {samples.length > 0 ? samples.join(", ") : "No samples"}
                      </span>
                    </div>
                  );
                })}
                {formData.dynamicColumns.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No variables defined. The template will use {"{{company}}"} only.
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Only selected variables will be used in the AI-generated template.
              </p>
            </div>

            {/* Quick Templates */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Templates</Label>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((example) => (
                  <Button
                    key={example.id}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "text-xs",
                      userPrompt === example.prompt && "border-primary bg-primary/5"
                    )}
                    onClick={() => setUserPrompt(example.prompt)}
                  >
                    <span className="mr-1">{example.icon}</span>
                    {example.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* User prompt input */}
            <div className="space-y-2">
              <Label htmlFor="ai-prompt" className="text-sm font-medium">
                Guide the AI (optional)
              </Label>
              <Textarea
                id="ai-prompt"
                placeholder="e.g., Focus on trust and credibility, include FAQ section, keep it minimal and clean, emphasize local service areas, use professional tone..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Describe what you want the template to emphasize or include. Leave empty for default generation.
              </p>
            </div>

            {error && (
              <p className="text-destructive text-sm text-center">{error}</p>
            )}

            <div className="text-center">
              <Button 
                onClick={generateTemplate} 
                size="lg"
                disabled={selectedVariables.length === 0 && formData.dynamicColumns.length > 0}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Template for {currentEntity?.name}
              </Button>
            </div>
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
            selectedVariables={selectedVariables}
            onTemplateUpdate={handleTemplateUpdate}
          />
        )}

        {/* Action buttons - No Skip button */}
        {generationStatus === "reviewing" && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={generateTemplate} disabled={isGenerating}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
            <Button onClick={handleApprove}>
              <Check className="h-4 w-4 mr-2" />
              {currentEntityIndex < entities.length - 1 ? "Approve & Next" : "Approve & Finish"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper to analyze variable and prompt usage in a value
function analyzeContent(value: string | string[]): { variables: string[]; hasPrompt: boolean; hasImagePrompt: boolean } {
  const values = Array.isArray(value) ? value : [value];
  const variables: string[] = [];
  let hasPrompt = false;
  let hasImagePrompt = false;

  values.forEach((v) => {
    const str = String(v);
    // Extract {{variable}} patterns
    const varMatches = str.match(/\{\{(\w+)\}\}/g) || [];
    varMatches.forEach((m) => {
      const varName = m.replace(/\{\{|\}\}/g, "");
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    });
    // Check for prompt() patterns
    if (/prompt\s*\(/.test(str)) hasPrompt = true;
    // Check for image_prompt() patterns
    if (/image_prompt\s*\(/.test(str)) hasImagePrompt = true;
  });

  return { variables, hasPrompt, hasImagePrompt };
}

// Analyze if section is missing expected content for its type
function getSectionWarnings(section: GeneratedSection, selectedVars: string[]): string[] {
  const warnings: string[] = [];
  const content = section.content;
  
  // Check if content is empty
  if (!content || Object.keys(content).length === 0) {
    warnings.push("Section has no content - click Edit to add");
    return warnings;
  }
  
  // Check for missing variables in key fields
  const keyFields = ['headline', 'title', 'body', 'subheadline'];
  const hasVariable = keyFields.some(field => 
    content[field] && /\{\{\w+\}\}/.test(String(content[field]))
  );
  
  // Variable usage is now purely informational - no warnings for unused variables
  
  // Check if prompts exist for dynamic content
  const hasPrompt = Object.values(content).some(v => 
    /prompt\s*\(/.test(String(Array.isArray(v) ? v.join('') : v))
  );
  
  // For content-heavy sections, warn if no prompts
  if (['content', 'faq', 'pros_cons', 'testimonials', 'benefits', 'process'].includes(section.type) && !hasPrompt) {
    warnings.push("Consider adding AI prompts for dynamic content");
  }
  
  return warnings;
}

// Helper component to highlight variables and prompts in content
function HighlightedContent({ value }: { value: string | string[] }) {
  const str = Array.isArray(value)
    ? `[${value.map((v) => `"${v}"`).join(", ")}]`
    : String(value);

  // Truncate long strings
  const displayStr = str.length > 150 ? str.substring(0, 150) + "..." : str;

  // Highlight patterns using React elements instead of dangerouslySetInnerHTML for safety
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /(\{\{\w+\}\})|image_prompt\s*\([^)]+\)|prompt\s*\([^)]+\)/g;
  let match;

  while ((match = regex.exec(displayStr)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} className="text-muted-foreground">
          {displayStr.substring(lastIndex, match.index)}
        </span>
      );
    }

    // Add highlighted match
    const matchStr = match[0];
    if (matchStr.startsWith("{{")) {
      parts.push(
        <span key={`var-${match.index}`} className="text-primary font-medium">
          {matchStr}
        </span>
      );
    } else if (matchStr.startsWith("image_prompt")) {
      parts.push(
        <span key={`img-${match.index}`} className="text-purple-600 italic">
          {matchStr}
        </span>
      );
    } else if (matchStr.startsWith("prompt")) {
      parts.push(
        <span key={`prompt-${match.index}`} className="text-amber-600 italic">
          {matchStr}
        </span>
      );
    }

    lastIndex = match.index + matchStr.length;
  }

  // Add remaining text
  if (lastIndex < displayStr.length) {
    parts.push(
      <span key={`text-end`} className="text-muted-foreground">
        {displayStr.substring(lastIndex)}
      </span>
    );
  }

  return <span className="ml-2 text-xs break-all">{parts}</span>;
}

// Template preview component with enhanced variable analysis and inline editing
interface TemplatePreviewProps {
  template: GeneratedTemplate;
  entity: Entity;
  variables: DynamicColumn[];
  selectedVariables: string[];
  onTemplateUpdate?: (template: GeneratedTemplate) => void;
}

function TemplatePreview({ template, entity, variables, selectedVariables, onTemplateUpdate }: TemplatePreviewProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  
  // Handle content edit for a section
  const handleContentEdit = (sectionId: string, field: string, value: any) => {
    const updatedSections = template.sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          content: {
            ...s.content,
            [field]: value
          }
        };
      }
      return s;
    });
    
    onTemplateUpdate?.({
      ...template,
      sections: updatedSections,
    });
  };
  
  // Handle adding item to array field
  const handleAddItem = (sectionId: string, field: string, currentValue: string[]) => {
    handleContentEdit(sectionId, field, [...currentValue, ""]);
  };
  
  // Handle removing item from array field
  const handleRemoveItem = (sectionId: string, field: string, currentValue: string[], index: number) => {
    const newItems = currentValue.filter((_, i) => i !== index);
    handleContentEdit(sectionId, field, newItems);
  };
  
  // Handle updating item in array field
  const handleUpdateItem = (sectionId: string, field: string, currentValue: string[], index: number, newValue: string) => {
    const newItems = [...currentValue];
    newItems[index] = newValue;
    handleContentEdit(sectionId, field, newItems);
  };
  
  // Handle removing a section
  const handleRemoveSection = (sectionId: string) => {
    const updatedSections = template.sections.filter(s => s.id !== sectionId);
    onTemplateUpdate?.({
      ...template,
      sections: updatedSections,
    });
    toast.success("Section removed");
  };
  
  // Analyze each section for variable and prompt usage
  const sectionAnalysis = template.sections.map((section) => {
    const usedVariables: string[] = [];
    let hasPrompts = false;
    let hasImagePrompts = false;

    Object.values(section.content).forEach((value) => {
      const analysis = analyzeContent(value);
      analysis.variables.forEach((v) => {
        if (!usedVariables.includes(v)) {
          usedVariables.push(v);
        }
      });
      if (analysis.hasPrompt) hasPrompts = true;
      if (analysis.hasImagePrompt) hasImagePrompts = true;
    });
    
    const warnings = getSectionWarnings(section, selectedVariables);

    return {
      section,
      usedVariables,
      hasPrompts,
      hasImagePrompts,
      warnings,
    };
  });

  // Calculate overall variable usage summary
  const allVariableNames = [...selectedVariables, "company"];
  const variableUsageSummary = allVariableNames.map((varName) => {
    const sectionsUsing = sectionAnalysis.filter((a) =>
      a.usedVariables.includes(varName)
    );
    return {
      name: varName,
      usedIn: sectionsUsing.length,
      totalSections: template.sections.length,
    };
  });

  return (
    <div className="space-y-6">
      {/* Sections grid */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Generated Sections</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {template.sections.map((section) => {
            const analysis = sectionAnalysis.find(a => a.section.id === section.id);
            const hasWarnings = (analysis?.warnings.length || 0) > 0;
            return (
              <div
                key={section.id}
                className={cn(
                  "border rounded-lg p-3 text-center bg-muted/20",
                  hasWarnings && "border-amber-300 bg-amber-50/50"
                )}
              >
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                  {section.type}
                  {hasWarnings && <AlertCircle className="h-3 w-3 text-amber-500" />}
                </div>
                <div className="font-medium text-sm mt-1">{section.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Variable Usage Summary */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-3">Variable Usage Summary</h4>
        <div className="space-y-2">
          {variableUsageSummary.map(({ name, usedIn, totalSections }) => (
            <div key={name} className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs min-w-[100px] justify-center">
                {`{{${name}}}`}
              </Badge>
              <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    usedIn > 0 ? "bg-primary" : "bg-muted"
                  )}
                  style={{ width: `${(usedIn / totalSections) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground min-w-[60px] text-right">
                {usedIn}/{totalSections} sections
              </span>
              {usedIn > 0 && (
                <Check className="h-4 w-4 text-green-500 shrink-0" />
              )}
            </div>
          ))}
        </div>
        {variableUsageSummary.some(v => v.usedIn === 0) && (
          <p className="text-xs text-muted-foreground mt-3">
            Some variables are not used in this template. This is fine if intentional.
          </p>
        )}
      </div>

      {/* Variable Usage by Section - Collapsible with Editing */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Section Details</h4>
        <Accordion type="multiple" className="w-full">
          {sectionAnalysis.map(({ section, usedVariables, hasPrompts, hasImagePrompts, warnings }) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="text-sm hover:no-underline">
                <div className="flex items-center gap-2 flex-1">
                  <Badge variant="outline" className="text-xs">
                    {section.type}
                  </Badge>
                  <span className="font-medium">{section.name}</span>
                  {warnings.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5">
                      {warnings.length} issue{warnings.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 ml-auto mr-2">
                    {usedVariables.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5">
                        {usedVariables.length} vars
                      </Badge>
                    )}
                    {hasPrompts && (
                      <Badge className="text-[10px] px-1.5 bg-amber-100 text-amber-700 hover:bg-amber-100">
                        AI text
                      </Badge>
                    )}
                    {hasImagePrompts && (
                      <Badge className="text-[10px] px-1.5 bg-purple-100 text-purple-700 hover:bg-purple-100">
                        AI image
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 ml-1"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditingSection(editingSection === section.id ? null : section.id); 
                      }}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> 
                      {editingSection === section.id ? "Done" : "Edit"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleRemoveSection(section.id); 
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {/* Warnings display */}
                {warnings.length > 0 && (
                  <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                    {warnings.map((w, i) => <div key={i}>• {w}</div>)}
                  </div>
                )}
                
                {/* Editing mode */}
                {editingSection === section.id ? (
                  <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                    {Object.entries(section.content).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs font-mono">{key}</Label>
                        {Array.isArray(value) ? (
                          <div className="space-y-1">
                            {value.map((item, i) => (
                              <div key={i} className="flex gap-2">
                                <Input 
                                  value={item}
                                  onChange={(e) => handleUpdateItem(section.id, key, value, i, e.target.value)}
                                  className="font-mono text-xs"
                                />
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="shrink-0 h-10 w-10"
                                  onClick={() => handleRemoveItem(section.id, key, value, i)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAddItem(section.id, key, value)}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Item
                            </Button>
                          </div>
                        ) : (
                          <Textarea
                            value={String(value)}
                            onChange={(e) => handleContentEdit(section.id, key, e.target.value)}
                            className="font-mono text-xs min-h-[60px]"
                            placeholder={`Enter ${key}...`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* View mode */
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    {Object.entries(section.content).map(([key, value]) => (
                      <div key={key} className="text-sm flex flex-wrap items-start">
                        <code className="text-xs bg-muted px-1 rounded shrink-0">
                          {key}:
                        </code>
                        <HighlightedContent value={value} />
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-primary/20 border border-primary"></span>
          <span className="text-primary font-medium">{`{{variable}}`}</span>
          <span>= Data substitution</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span>
          <span className="text-amber-600 italic">prompt(...)</span>
          <span>= AI text</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></span>
          <span className="text-purple-600 italic">image_prompt(...)</span>
          <span>= AI image</span>
        </div>
      </div>
    </div>
  );
}

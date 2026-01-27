import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { CampaignFormData, TEMPLATES } from "../types";
import { cn } from "@/lib/utils";
import { AITemplateGeneratorDialog } from "./AITemplateGeneratorDialog";

interface TemplateSelectionStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
}

export function TemplateSelectionStep({ formData, updateFormData }: TemplateSelectionStepProps) {
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const handleAIComplete = () => {
    updateFormData({ selectedTemplate: "ai-generated" });
    setShowAIGenerator(false);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose a Template</h2>
        <p className="text-muted-foreground">
          Pick a page design to use for your campaign. You can preview your generated titles in each template.
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* AI Template Generator Card - First */}
        <div
          onClick={() => setShowAIGenerator(true)}
          className={cn(
            "border rounded-xl overflow-hidden transition-all cursor-pointer",
            formData.selectedTemplate === "ai-generated"
              ? "border-primary ring-2 ring-primary/20"
              : "border-dashed border-primary/50 hover:border-primary bg-primary/5"
          )}
        >
          {/* AI Preview */}
          <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse bg-primary/20 rounded-full blur-xl" />
              <Sparkles className="h-12 w-12 text-primary relative z-10" />
            </div>
            <span className="text-lg font-semibold text-primary mt-3">Create with AI</span>
          </div>

          {/* AI Info */}
          <div className="p-4 space-y-3">
            <h3 className="font-semibold">AI Template Generator</h3>
            <p className="text-sm text-muted-foreground">
              Let AI create sections, prompts, and blocks customized for your business.
            </p>
            <Button
              className="w-full"
              variant={formData.selectedTemplate === "ai-generated" ? "default" : "outline"}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {formData.selectedTemplate === "ai-generated" ? "Selected" : "Start AI Setup"}
            </Button>
          </div>
        </div>

        {/* Regular Templates */}
        {TEMPLATES.map((template) => (
          <div
            key={template.id}
            className={cn(
              "border rounded-xl overflow-hidden transition-all",
              formData.selectedTemplate === template.id
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            )}
          >
            {/* Template Preview */}
            <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <span className="text-sm text-muted-foreground font-medium px-4 py-2 bg-background/80 rounded-lg">
                {template.preview}
              </span>
            </div>

            {/* Template Info */}
            <div className="p-4 space-y-3">
              <h3 className="font-semibold">{template.name}</h3>
              <p className="text-sm text-muted-foreground">{template.description}</p>
              <Button
                onClick={() => updateFormData({ selectedTemplate: template.id })}
                className={cn(
                  "w-full",
                  formData.selectedTemplate === template.id
                    ? "bg-primary"
                    : "bg-primary/80 hover:bg-primary"
                )}
              >
                Select
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!formData.selectedTemplate && (
        <p className="text-center text-sm text-muted-foreground">
          Select a template to continue with your campaign setup.
        </p>
      )}

      {/* AI Generator Dialog */}
      <AITemplateGeneratorDialog
        open={showAIGenerator}
        onOpenChange={setShowAIGenerator}
        formData={formData}
        updateFormData={updateFormData}
        onComplete={handleAIComplete}
      />
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignFormData, TemplateStyleConfig, TemplateImagesConfig } from "../types";
import { getTemplateForBusinessType, TemplateSection } from "@/lib/campaignTemplates";
import { TemplateContentTab } from "./template-editor/TemplateContentTab";
import { TemplateStyleTab } from "./template-editor/TemplateStyleTab";
import { TemplateImagesTab } from "./template-editor/TemplateImagesTab";
import { TemplatePreviewPanel } from "./template-editor/TemplatePreviewPanel";
import { Monitor, Tablet, Smartphone, RotateCcw } from "lucide-react";

interface TemplateEditorStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

export type ViewportSize = "desktop" | "tablet" | "mobile";

const DEFAULT_STYLE: TemplateStyleConfig = {
  primaryColor: "#8B5CF6",
  backgroundColor: "#FFFFFF",
  typography: "Inter",
  buttonStyle: "rounded",
  buttonFill: "solid",
  darkMode: false,
};

const DEFAULT_IMAGES: TemplateImagesConfig = {
  sectionImages: [],
};

export function TemplateEditorStep({ formData, updateFormData, onBack }: TemplateEditorStepProps) {
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [activeTab, setActiveTab] = useState("content");
  
  // Get template based on business type or selected template
  const baseTemplate = getTemplateForBusinessType(formData.businessType);
  
  // Initialize template content from form data or base template
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>(() => {
    if (formData.templateContent?.sections && formData.templateContent.sections.length > 0) {
      return formData.templateContent.sections as TemplateSection[];
    }
    return [...baseTemplate.sections];
  });

  const [styleConfig, setStyleConfig] = useState<TemplateStyleConfig>(() => {
    if (formData.templateContent?.style) {
      return formData.templateContent.style;
    }
    return DEFAULT_STYLE;
  });

  const [imagesConfig, setImagesConfig] = useState<TemplateImagesConfig>(() => {
    if (formData.templateContent?.images) {
      return formData.templateContent.images;
    }
    return DEFAULT_IMAGES;
  });

  // Sync changes to parent form data
  const syncToFormData = () => {
    updateFormData({
      templateContent: {
        sections: templateSections,
        style: styleConfig,
        images: imagesConfig,
      },
    });
  };

  // Update section content
  const updateSectionContent = (sectionId: string, field: string, value: string | string[]) => {
    setTemplateSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, content: { ...section.content, [field]: value } }
          : section
      )
    );
  };

  // Reset to default template
  const handleReset = () => {
    setTemplateSections([...baseTemplate.sections]);
    setStyleConfig(DEFAULT_STYLE);
    setImagesConfig(DEFAULT_IMAGES);
  };

  // Save and sync on tab change or viewport change
  const handleTabChange = (tab: string) => {
    syncToFormData();
    setActiveTab(tab);
  };

  // Get sample data for preview
  const getSampleData = (): Record<string, string> => {
    const data: Record<string, string> = {
      company: formData.businessName || "Your Company",
    };

    // Get first value from each scratch data column
    Object.entries(formData.scratchData).forEach(([key, values]) => {
      if (values.length > 0) {
        // Use singular form of the key for placeholder
        const singularKey = key.endsWith("ies") 
          ? key.slice(0, -3) + "y" 
          : key.endsWith("s") 
            ? key.slice(0, -1) 
            : key;
        data[singularKey] = values[0];
        data[key] = values[0]; // Also keep plural version
      }
    });

    return data;
  };

  return (
    <div className="flex flex-col h-full -mx-6 -my-8">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          ← Back to Templates
        </Button>
        
        <div className="flex items-center gap-1 bg-background rounded-lg p-1 border">
          <Button
            variant={viewport === "desktop" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewport("desktop")}
            className="gap-1.5"
          >
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Desktop</span>
          </Button>
          <Button
            variant={viewport === "tablet" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewport("tablet")}
            className="gap-1.5"
          >
            <Tablet className="h-4 w-4" />
            <span className="hidden sm:inline">Tablet</span>
          </Button>
          <Button
            variant={viewport === "mobile" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewport("mobile")}
            className="gap-1.5"
          >
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Mobile</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Split Panel */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Live Preview */}
        <div className="flex-1 bg-muted/20 p-6 overflow-auto">
          <TemplatePreviewPanel
            sections={templateSections}
            styleConfig={styleConfig}
            imagesConfig={imagesConfig}
            sampleData={getSampleData()}
            viewport={viewport}
          />
        </div>

        {/* Right: Editor Panel */}
        <div className="w-[420px] border-l bg-background flex flex-col">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
            <TabsList className="grid grid-cols-3 mx-4 mt-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto">
              <TabsContent value="content" className="m-0 p-4 h-full">
                <TemplateContentTab
                  sections={templateSections}
                  onUpdateSection={updateSectionContent}
                  sampleData={getSampleData()}
                />
              </TabsContent>

              <TabsContent value="style" className="m-0 p-4 h-full">
                <TemplateStyleTab
                  styleConfig={styleConfig}
                  onUpdateStyle={setStyleConfig}
                />
              </TabsContent>

              <TabsContent value="images" className="m-0 p-4 h-full">
                <TemplateImagesTab
                  imagesConfig={imagesConfig}
                  onUpdateImages={setImagesConfig}
                />
              </TabsContent>
            </div>
          </Tabs>

          {/* Save indicator */}
          <div className="px-4 py-3 border-t text-center">
            <span className="text-xs text-muted-foreground">✓ All changes saved automatically</span>
          </div>
        </div>
      </div>
    </div>
  );
}

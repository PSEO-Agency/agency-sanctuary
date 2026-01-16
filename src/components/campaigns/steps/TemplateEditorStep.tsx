import { useState, useEffect } from "react";
import { CampaignFormData, TemplateStyleConfig, TemplateImagesConfig } from "../types";
import { getTemplateForBusinessType, TemplateSection } from "@/lib/campaignTemplates";
import { UnifiedPageBuilder, DEFAULT_STYLE_CONFIG, DEFAULT_IMAGES_CONFIG } from "@/components/page-builder";
import { loadGoogleFont } from "@/lib/fontLoader";

interface TemplateEditorStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

export function TemplateEditorStep({ formData, updateFormData, onBack }: TemplateEditorStepProps) {
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
    return DEFAULT_STYLE_CONFIG;
  });

  const [imagesConfig, setImagesConfig] = useState<TemplateImagesConfig>(() => {
    if (formData.templateContent?.images) {
      return formData.templateContent.images;
    }
    return DEFAULT_IMAGES_CONFIG;
  });

  // Load font on mount
  useEffect(() => {
    loadGoogleFont(styleConfig.typography);
  }, []);

  // Sync changes to parent form data
  const syncToFormData = (
    sections: TemplateSection[],
    style: TemplateStyleConfig,
    images: TemplateImagesConfig
  ) => {
    updateFormData({
      templateContent: {
        sections,
        style,
        images,
      },
    });
  };

  // Handle sections change
  const handleSectionsChange = (sections: TemplateSection[]) => {
    setTemplateSections(sections);
    syncToFormData(sections, styleConfig, imagesConfig);
  };

  // Handle style change
  const handleStyleChange = (config: TemplateStyleConfig) => {
    setStyleConfig(config);
    loadGoogleFont(config.typography);
    syncToFormData(templateSections, config, imagesConfig);
  };

  // Handle images change
  const handleImagesChange = (config: TemplateImagesConfig) => {
    setImagesConfig(config);
    syncToFormData(templateSections, styleConfig, config);
  };

  // Reset to default template
  const handleReset = () => {
    const newSections = [...baseTemplate.sections];
    const newStyle = DEFAULT_STYLE_CONFIG;
    const newImages = DEFAULT_IMAGES_CONFIG;
    
    setTemplateSections(newSections);
    setStyleConfig(newStyle);
    setImagesConfig(newImages);
    syncToFormData(newSections, newStyle, newImages);
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
      <UnifiedPageBuilder
        mode="template"
        sections={templateSections}
        styleConfig={styleConfig}
        imagesConfig={imagesConfig}
        dataValues={getSampleData()}
        onSectionsChange={handleSectionsChange}
        onStyleUpdate={handleStyleChange}
        onImagesUpdate={handleImagesChange}
        onBack={onBack}
        backLabel="Back to Templates"
        showBlocksPanel={true}
        showSettingsPanel={true}
        showViewportSwitcher={true}
        showResetButton={true}
        onReset={handleReset}
      />
    </div>
  );
}

// Export ViewportSize for backward compatibility
export type { ViewportSize } from "@/components/page-builder/types";

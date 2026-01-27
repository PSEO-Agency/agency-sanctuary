import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CampaignFormData, TemplateStyleConfig, TemplateImagesConfig, TemplateContentConfig, Entity } from "../types";
import { getTemplateForBusinessType, TemplateSection } from "@/lib/campaignTemplates";
import { UnifiedPageBuilder, DEFAULT_STYLE_CONFIG, DEFAULT_IMAGES_CONFIG } from "@/components/page-builder";
import { loadGoogleFont } from "@/lib/fontLoader";
import { EntitySelector } from "../EntitySelector";

interface TemplateEditorStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
  onBack: () => void;
  onFinish?: () => void;
}

export function TemplateEditorStep({ formData, updateFormData, onBack, onFinish }: TemplateEditorStepProps) {
  // Get template based on business type or selected template
  const baseTemplate = getTemplateForBusinessType(formData.businessType);
  
  // Get entities from form data
  const entities = formData.entities || [];
  
  // Track which entity is currently being edited
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(
    entities.length > 0 ? entities[0].id : null
  );

  // Calculate pages per entity for display
  const pagesPerEntity: Record<string, number> = {};
  (formData.titlePatterns || []).forEach(pattern => {
    const patternLower = pattern.pattern.toLowerCase();
    const usedColumns = formData.dynamicColumns.filter(col => 
      patternLower.includes(`{{${col.variableName.toLowerCase()}}}`)
    );
    
    if (usedColumns.length === 0) return;
    
    const pageCount = usedColumns.reduce((acc, col) => {
      const items = formData.scratchData[col.id] || [];
      return acc * (items.length || 1);
    }, 1);
    
    pagesPerEntity[pattern.entityId] = (pagesPerEntity[pattern.entityId] || 0) + pageCount;
  });

  // Track completed entities (ones that have been customized)
  const [completedEntities, setCompletedEntities] = useState<string[]>([]);

  // Get current entity's template or initialize from defaults
  const getEntityTemplate = (entityId: string | null): TemplateContentConfig => {
    if (!entityId) {
      return formData.templateContent || {
        sections: [...baseTemplate.sections],
        style: DEFAULT_STYLE_CONFIG,
        images: DEFAULT_IMAGES_CONFIG,
      };
    }
    
    const entityTemplates = formData.entityTemplates || {};
    if (entityTemplates[entityId]) {
      return entityTemplates[entityId];
    }
    
    // Initialize from base template or legacy templateContent
    return formData.templateContent || {
      sections: [...baseTemplate.sections],
      style: DEFAULT_STYLE_CONFIG,
      images: DEFAULT_IMAGES_CONFIG,
    };
  };

  const currentTemplate = getEntityTemplate(selectedEntityId);
  
  // Initialize template content from form data or base template
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>(() => {
    if (currentTemplate?.sections && currentTemplate.sections.length > 0) {
      return currentTemplate.sections as TemplateSection[];
    }
    return [...baseTemplate.sections];
  });

  const [styleConfig, setStyleConfig] = useState<TemplateStyleConfig>(() => {
    if (currentTemplate?.style) {
      return currentTemplate.style;
    }
    return DEFAULT_STYLE_CONFIG;
  });

  const [imagesConfig, setImagesConfig] = useState<TemplateImagesConfig>(() => {
    if (currentTemplate?.images) {
      return currentTemplate.images;
    }
    return DEFAULT_IMAGES_CONFIG;
  });

  // Update local state when entity changes
  useEffect(() => {
    const template = getEntityTemplate(selectedEntityId);
    setTemplateSections(template.sections as TemplateSection[] || [...baseTemplate.sections]);
    setStyleConfig(template.style || DEFAULT_STYLE_CONFIG);
    setImagesConfig(template.images || DEFAULT_IMAGES_CONFIG);
  }, [selectedEntityId]);

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
    const newTemplate: TemplateContentConfig = { sections, style, images };
    
    if (selectedEntityId && entities.length > 0) {
      // Save to entity-specific template
      const updatedEntityTemplates = {
        ...formData.entityTemplates,
        [selectedEntityId]: newTemplate,
      };
      
      updateFormData({
        entityTemplates: updatedEntityTemplates,
        templateContent: newTemplate, // Also update legacy field
      });
      
      // Mark entity as completed
      if (!completedEntities.includes(selectedEntityId)) {
        setCompletedEntities([...completedEntities, selectedEntityId]);
      }
    } else {
      // No entities - use legacy single template
      updateFormData({
        templateContent: newTemplate,
      });
    }
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

  // Get sample data for preview - use dynamic columns
  const getSampleData = (): Record<string, string> => {
    const data: Record<string, string> = {
      company: formData.businessName || "Your Company",
    };

    // Get first value from each column using dynamic column config
    formData.dynamicColumns.forEach((col) => {
      const values = formData.scratchData[col.id] || [];
      if (values.length > 0) {
        // Map by variable name for template placeholder matching
        data[col.variableName] = values[0];
        
        // Also add plural form for backward compatibility
        const pluralKey = col.variableName.endsWith("y") 
          ? col.variableName.slice(0, -1) + "ies"
          : col.variableName + "s";
        data[pluralKey] = values[0];
      }
    });

    // Fallback: Also process scratchData directly for CSV uploads
    Object.entries(formData.scratchData).forEach(([key, values]) => {
      if (values.length > 0 && !data[key]) {
        // Use singular form of the key for placeholder
        const singularKey = key.endsWith("ies") 
          ? key.slice(0, -3) + "y" 
          : key.endsWith("s") 
            ? key.slice(0, -1) 
            : key;
        data[singularKey] = values[0];
        data[key] = values[0];
      }
    });

    return data;
  };

  // Get current entity name for display
  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  return (
    <div className="flex flex-col h-full">
      {/* Entity Progress Bar - Only show if there are entities */}
      {entities.length > 0 && (
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Template Configuration by Entity</h3>
            <span className="text-xs text-muted-foreground">
              {completedEntities.length}/{entities.length} configured
            </span>
          </div>
          <EntitySelector
            entities={entities}
            selectedEntityId={selectedEntityId}
            onSelectEntity={setSelectedEntityId}
            pagesPerEntity={pagesPerEntity}
            completedEntities={completedEntities}
            mode="progress-bar"
          />
        </div>
      )}

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
        headerContent={
          <div className="flex items-center gap-4 ml-auto">
            {selectedEntity && (
              <div className="text-sm text-muted-foreground">
                Editing: <span className="font-medium text-foreground">{selectedEntity.name}</span>
                <span className="text-xs ml-1">({selectedEntity.urlPrefix})</span>
              </div>
            )}
            {onFinish && (
              <Button onClick={onFinish}>
                Finish Campaign
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}

// Export ViewportSize for backward compatibility
export type { ViewportSize } from "@/components/page-builder/types";

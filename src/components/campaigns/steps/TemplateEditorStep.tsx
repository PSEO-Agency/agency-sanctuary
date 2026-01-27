import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
      {/* Entity Progress Bar - Only show if more than one entity */}
      {entities.length > 1 && (
        <div className="border-b bg-muted/30 px-3 py-2">
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

      {/* Current Entity Banner - Always show if entities exist */}
      {entities.length > 0 && selectedEntity && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-3">
          <Tags className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm">
            Editing template for:
            <span className="font-semibold ml-1">{selectedEntity.name}</span>
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            ({selectedEntity.urlPrefix})
          </span>
          {entities.length > 1 && (
            <Badge variant="outline" className="ml-auto">
              {completedEntities.length + 1}/{entities.length}
            </Badge>
          )}
        </div>
      )}

      {/* No Entities Warning */}
      {entities.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
          <span className="text-sm text-yellow-700 dark:text-yellow-400">
            No entities defined. This template will apply to all pages.
          </span>
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
        backLabel="Back"
        defaultBlocksPanelOpen={false}
        defaultSettingsPanelOpen={false}
        showBlocksPanel={true}
        showSettingsPanel={true}
        showViewportSwitcher={true}
        showResetButton={true}
        onReset={handleReset}
        headerContent={
          onFinish && (
            <Button onClick={onFinish} className="ml-auto">
              Finish Campaign
            </Button>
          )
        }
      />
    </div>
  );
}

// Export ViewportSize for backward compatibility
export type { ViewportSize } from "@/components/page-builder/types";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Tablet, Smartphone, RotateCcw, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { TemplateSection } from "@/lib/campaignTemplates";
import { TemplateStyleConfig, TemplateImagesConfig } from "@/components/campaigns/types";
import { SectionContent } from "@/hooks/useCampaignPages";
import { BlocksPanel } from "./BlocksPanel";
import { SettingsPanel } from "./SettingsPanel";
import { PreviewCanvas } from "./PreviewCanvas";
import { 
  ViewportSize, 
  BlockDefinition, 
  DEFAULT_STYLE_CONFIG, 
  DEFAULT_IMAGES_CONFIG 
} from "./types";
import { loadGoogleFont } from "@/lib/fontLoader";

interface UnifiedPageBuilderProps {
  // Template data
  sections: TemplateSection[];
  styleConfig?: TemplateStyleConfig;
  imagesConfig?: TemplateImagesConfig;
  
  // Page data
  dataValues: Record<string, string>;
  generatedContent?: SectionContent[];
  
  // Mode
  mode: "template" | "page";
  isEditable?: boolean;
  
  // Callbacks
  onSectionUpdate?: (sectionId: string, field: string, value: string | string[]) => void;
  onSectionsChange?: (sections: TemplateSection[]) => void;
  onStyleUpdate?: (config: TemplateStyleConfig) => void;
  onImagesUpdate?: (config: TemplateImagesConfig) => void;
  onFieldEdit?: (sectionId: string, fieldName: string, value: string) => void;
  
  // Navigation
  onBack?: () => void;
  backLabel?: string;
  
  // Panel defaults
  defaultBlocksPanelOpen?: boolean;
  defaultSettingsPanelOpen?: boolean;
  showBlocksPanel?: boolean;
  showSettingsPanel?: boolean;
  
  // Header customization
  showViewportSwitcher?: boolean;
  showResetButton?: boolean;
  onReset?: () => void;
  
  // Additional content in header
  headerContent?: React.ReactNode;
}

export function UnifiedPageBuilder({
  sections,
  styleConfig = DEFAULT_STYLE_CONFIG,
  imagesConfig = DEFAULT_IMAGES_CONFIG,
  dataValues,
  generatedContent = [],
  mode,
  isEditable = false,
  onSectionUpdate,
  onSectionsChange,
  onStyleUpdate,
  onImagesUpdate,
  onFieldEdit,
  onBack,
  backLabel = "Back",
  defaultBlocksPanelOpen = true,
  defaultSettingsPanelOpen = true,
  showBlocksPanel = true,
  showSettingsPanel = true,
  showViewportSwitcher = true,
  showResetButton = false,
  onReset,
  headerContent,
}: UnifiedPageBuilderProps) {
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [blocksPanelOpen, setBlocksPanelOpen] = useState(defaultBlocksPanelOpen);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(defaultSettingsPanelOpen);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState("content");

  // Load font on mount
  useEffect(() => {
    if (styleConfig.typography) {
      loadGoogleFont(styleConfig.typography);
    }
  }, [styleConfig.typography]);

  const handleAddBlock = (block: BlockDefinition) => {
    const newSection: TemplateSection = {
      id: `${block.type}-${Date.now()}`,
      type: block.type,
      name: block.name,
      content: { ...block.defaultContent },
    };
    
    const updatedSections = [...sections, newSection];
    onSectionsChange?.(updatedSections);
    setSelectedSection(newSection.id);
  };

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSection(sectionId);
    
    // Open settings panel and switch to content tab for editing
    if (mode === "template") {
      setSettingsPanelOpen(true);
      setActiveSettingsTab("content");
    }
  };

  const getSampleData = (): Record<string, string> => {
    return {
      company: dataValues.company || "Your Company",
      ...dataValues,
    };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          )}
          {headerContent}
        </div>
        
        <div className="flex items-center gap-4">
          {showViewportSwitcher && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewport === "desktop" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewport("desktop")}
                className="gap-1.5 h-8"
              >
                <Monitor className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Desktop</span>
              </Button>
              <Button
                variant={viewport === "tablet" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewport("tablet")}
                className="gap-1.5 h-8"
              >
                <Tablet className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Tablet</span>
              </Button>
              <Button
                variant={viewport === "mobile" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewport("mobile")}
                className="gap-1.5 h-8"
              >
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Mobile</span>
              </Button>
            </div>
          )}

          {showResetButton && onReset && (
            <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Blocks Panel */}
        {showBlocksPanel && (
          <BlocksPanel
            isOpen={blocksPanelOpen}
            onToggle={() => setBlocksPanelOpen(!blocksPanelOpen)}
            onAddBlock={handleAddBlock}
            sections={sections}
            onSelectSection={handleSectionSelect}
            selectedSection={selectedSection}
          />
        )}

        {/* Center: Preview Canvas */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <PreviewCanvas
            sections={sections}
            styleConfig={styleConfig}
            imagesConfig={imagesConfig}
            dataValues={getSampleData()}
            generatedContent={generatedContent}
            viewport={viewport}
            isEditable={isEditable}
            onFieldEdit={onFieldEdit}
            selectedSection={selectedSection}
            onSectionSelect={handleSectionSelect}
            mode={mode}
          />
        </div>

        {/* Right: Settings Panel */}
        {showSettingsPanel && (
          <SettingsPanel
            isOpen={settingsPanelOpen}
            onToggle={() => setSettingsPanelOpen(!settingsPanelOpen)}
            sections={sections}
            styleConfig={styleConfig}
            imagesConfig={imagesConfig}
            sampleData={getSampleData()}
            onUpdateSection={(sectionId, field, value) => {
              onSectionUpdate?.(sectionId, field, value);
              
              // Update sections if using onSectionsChange
              if (onSectionsChange) {
                const updated = sections.map(s => 
                  s.id === sectionId 
                    ? { ...s, content: { ...s.content, [field]: value } }
                    : s
                );
                onSectionsChange(updated);
              }
            }}
            onUpdateStyle={(config) => {
              loadGoogleFont(config.typography);
              onStyleUpdate?.(config);
            }}
            onUpdateImages={onImagesUpdate || (() => {})}
            activeTab={activeSettingsTab}
            onTabChange={setActiveSettingsTab}
          />
        )}
      </div>

      {/* Auto-save indicator */}
      <div className="px-4 py-2 border-t bg-muted/30 text-center flex-shrink-0">
        <span className="text-xs text-muted-foreground">✓ All changes saved automatically</span>
      </div>
    </div>
  );
}

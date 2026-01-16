import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelRightClose, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TemplateSection } from "@/lib/campaignTemplates";
import { TemplateStyleConfig, TemplateImagesConfig } from "@/components/campaigns/types";
import { TemplateContentTab } from "@/components/campaigns/steps/template-editor/TemplateContentTab";
import { TemplateStyleTab } from "@/components/campaigns/steps/template-editor/TemplateStyleTab";
import { TemplateImagesTab } from "@/components/campaigns/steps/template-editor/TemplateImagesTab";
import { loadGoogleFont } from "@/lib/fontLoader";

interface SettingsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  sections: TemplateSection[];
  styleConfig: TemplateStyleConfig;
  imagesConfig: TemplateImagesConfig;
  sampleData: Record<string, string>;
  onUpdateSection: (sectionId: string, field: string, value: string | string[]) => void;
  onUpdateStyle: (config: TemplateStyleConfig) => void;
  onUpdateImages: (config: TemplateImagesConfig) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function SettingsPanel({
  isOpen,
  onToggle,
  sections,
  styleConfig,
  imagesConfig,
  sampleData,
  onUpdateSection,
  onUpdateStyle,
  onUpdateImages,
  activeTab = "content",
  onTabChange,
}: SettingsPanelProps) {
  // Load font when style changes
  useEffect(() => {
    if (styleConfig.typography) {
      loadGoogleFont(styleConfig.typography);
    }
  }, [styleConfig.typography]);

  return (
    <div
      className={cn(
        "border-l bg-background flex flex-col transition-all duration-300 ease-in-out flex-shrink-0",
        isOpen ? "w-[380px]" : "w-12"
      )}
    >
      {/* Toggle Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggle}
        >
          {isOpen ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRight className="h-4 w-4" />
          )}
        </Button>
        {isOpen && (
          <span className="text-sm font-medium text-foreground">Settings</span>
        )}
      </div>

      {isOpen && (
        <Tabs
          value={activeTab}
          onValueChange={onTabChange}
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className="grid grid-cols-3 mx-3 mt-3">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="content" className="m-0 p-4">
              <TemplateContentTab
                sections={sections}
                onUpdateSection={onUpdateSection}
                sampleData={sampleData}
              />
            </TabsContent>

            <TabsContent value="style" className="m-0 p-4">
              <TemplateStyleTab
                styleConfig={styleConfig}
                onUpdateStyle={onUpdateStyle}
              />
            </TabsContent>

            <TabsContent value="images" className="m-0 p-4">
              <TemplateImagesTab
                imagesConfig={imagesConfig}
                onUpdateImages={onUpdateImages}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      )}
    </div>
  );
}

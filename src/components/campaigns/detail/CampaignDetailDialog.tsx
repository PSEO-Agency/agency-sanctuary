import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutGrid, 
  BarChart3, 
  FileEdit, 
  Settings, 
  Blocks,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { useCampaignPages } from "@/hooks/useCampaignPages";
import { MatrixBuilderTab } from "./tabs/MatrixBuilderTab";
import { KeywordMapperTab } from "./tabs/KeywordMapperTab";
import { CMSEditorTab } from "./tabs/CMSEditorTab";
import { DeploymentSettingsTab } from "./tabs/DeploymentSettingsTab";
import { ReusableBlocksTab } from "./tabs/ReusableBlocksTab";
import { PagesTab } from "./tabs/PagesTab";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getTemplateForBusinessType } from "@/lib/campaignTemplates";
import { toast } from "sonner";

interface CampaignDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignDB | null;
  onSave: (campaign: CampaignDB) => void;
}

type TabId = "matrix" | "keywords" | "pages" | "cms" | "deployment" | "blocks";

const TABS = [
  { id: "matrix" as TabId, label: "Matrix Builder", icon: LayoutGrid },
  { id: "keywords" as TabId, label: "Keyword Mapper", icon: BarChart3 },
  { id: "pages" as TabId, label: "Pages", icon: FileText },
  { id: "cms" as TabId, label: "CMS Editor", icon: FileEdit },
  { id: "deployment" as TabId, label: "Deployment Settings", icon: Settings },
  { id: "blocks" as TabId, label: "Reusable Blocks", icon: Blocks },
];

export function CampaignDetailDialog({
  open,
  onOpenChange,
  campaign,
  onSave,
}: CampaignDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>("pages");
  const { pages, loading: pagesLoading, updatePageSEO, updatePageContent, updatePageKeywords, deletePage, refetch: refetchPages } = useCampaignPages(campaign?.id || null);

  if (!campaign) return null;

  // Get template for this campaign's business type
  const template = getTemplateForBusinessType(campaign.business_type || "local");

  // Generate content using the edge function
  const handleGenerateContent = async (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) {
      toast.error("Page not found");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-content", {
        body: {
          page_id: pageId,
          business_name: campaign.business_name || "Your Company",
          business_type: campaign.business_type || "local",
          data_values: page.data_values || {},
          template_sections: template.sections,
          tone_of_voice: "Professional, friendly, and trustworthy",
        },
      });

      if (error) {
        console.error("Error generating content:", error);
        if (error.message?.includes("429")) {
          toast.error("Rate limit exceeded. Please try again in a moment.");
        } else if (error.message?.includes("402")) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          toast.error("Failed to generate content. Please try again.");
        }
        throw error;
      }

      await refetchPages();
      return data;
    } catch (err) {
      console.error("Error calling generate-campaign-content:", err);
      throw err;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "pages":
        return (
          <PagesTab 
            campaign={campaign} 
            pages={pages} 
            pagesLoading={pagesLoading}
            onDeletePage={deletePage}
            onGenerateContent={handleGenerateContent}
            onRefetchPages={refetchPages}
          />
        );
      case "matrix":
        return <MatrixBuilderTab campaign={campaign} pages={pages} onRefreshPages={refetchPages} />;
      case "keywords":
        return <KeywordMapperTab campaign={campaign} pages={pages} pagesLoading={pagesLoading} onUpdateKeywords={async (id, kw) => { updatePageKeywords(id, kw); }} />;
      case "cms":
        return <CMSEditorTab campaign={campaign} pages={pages} pagesLoading={pagesLoading} onUpdateSEO={updatePageSEO} onUpdateContent={updatePageContent} />;
      case "deployment":
        return <DeploymentSettingsTab campaign={campaign} />;
      case "blocks":
        return <ReusableBlocksTab campaign={campaign} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-52 bg-gradient-to-b from-primary via-primary/90 to-primary/80 text-white p-4 flex flex-col flex-shrink-0">
            <h2 className="font-bold text-lg mb-6">Campaign</h2>
            <nav className="space-y-1 flex-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                      activeTab === tab.id
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="leading-tight">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-background">
            <ScrollArea className="flex-1">
              <div className="p-6">
                {renderTabContent()}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end gap-3 flex-shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => onSave(campaign)}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

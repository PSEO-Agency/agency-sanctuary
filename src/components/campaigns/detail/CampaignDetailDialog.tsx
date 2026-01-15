import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutGrid, 
  BarChart3, 
  Pencil, 
  FileEdit, 
  Settings, 
  Blocks 
} from "lucide-react";
import { useState } from "react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { useCampaignPages } from "@/hooks/useCampaignPages";
import { MatrixBuilderTab } from "./tabs/MatrixBuilderTab";
import { KeywordMapperTab } from "./tabs/KeywordMapperTab";
import { ContentGeneratorTab } from "./tabs/ContentGeneratorTab";
import { CMSEditorTab } from "./tabs/CMSEditorTab";
import { DeploymentSettingsTab } from "./tabs/DeploymentSettingsTab";
import { ReusableBlocksTab } from "./tabs/ReusableBlocksTab";
import { cn } from "@/lib/utils";

interface CampaignDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignDB | null;
  onSave: (campaign: CampaignDB) => void;
}

type TabId = "matrix" | "keywords" | "content" | "cms" | "deployment" | "blocks";

const TABS = [
  { id: "matrix" as TabId, label: "Matrix Builder", icon: LayoutGrid },
  { id: "keywords" as TabId, label: "Keyword Mapper", icon: BarChart3 },
  { id: "content" as TabId, label: "Content Generator", icon: Pencil },
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
  const [activeTab, setActiveTab] = useState<TabId>("matrix");
  const { pages, loading: pagesLoading, updatePageSEO, updatePageContent, updatePageKeywords, refetch: refetchPages } = useCampaignPages(campaign?.id || null);

  if (!campaign) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case "matrix":
        return <MatrixBuilderTab campaign={campaign} pages={pages} onRefreshPages={refetchPages} />;
      case "keywords":
        return <KeywordMapperTab campaign={campaign} pages={pages} pagesLoading={pagesLoading} onUpdateKeywords={async (id, kw) => { updatePageKeywords(id, kw); }} />;
      case "content":
        return <ContentGeneratorTab campaign={campaign} pages={pages} pagesLoading={pagesLoading} onUpdateSEO={updatePageSEO} onUpdateContent={updatePageContent} />;
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
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-52 bg-gradient-to-b from-primary via-primary/90 to-primary/80 text-white p-4 flex flex-col">
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
          <div className="flex-1 flex flex-col bg-background overflow-hidden">
            <ScrollArea className="flex-1 h-[calc(90vh-80px)]">
              <div className="p-6 max-h-full">
                {renderTabContent()}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end gap-3">
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

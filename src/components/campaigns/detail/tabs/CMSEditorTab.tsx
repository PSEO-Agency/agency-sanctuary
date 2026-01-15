import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Search, Eye, Loader2, Save, FileText, Layers, Settings } from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB, SectionContent } from "@/hooks/useCampaignPages";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PagePreviewDialog } from "../PagePreviewDialog";
import { SectionEditor } from "@/components/preview/SectionEditor";

interface CMSEditorTabProps {
  campaign: CampaignDB;
  pages: CampaignPageDB[];
  pagesLoading: boolean;
  onUpdateSEO: (id: string, metaTitle: string, metaDescription: string) => Promise<boolean>;
  onUpdateContent: (id: string, sections: SectionContent[]) => Promise<boolean>;
}

export function CMSEditorTab({ campaign, pages, pagesLoading, onUpdateSEO, onUpdateContent }: CMSEditorTabProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<"seo" | "sections">("seo");
  const [localSections, setLocalSections] = useState<SectionContent[]>([]);

  const selectedPage = pages.find(p => p.id === selectedPageId);

  // Filter pages by search
  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    Object.values(page.data_values || {}).some(v => 
      v.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Load page data when selected
  useEffect(() => {
    if (selectedPage) {
      setMetaTitle(selectedPage.meta_title || "");
      setMetaDescription(selectedPage.meta_description || "");
      setLocalSections(selectedPage.sections_content || []);
    }
  }, [selectedPage]);

  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId);
  };

  const handleSave = async () => {
    if (!selectedPageId) return;
    
    setIsSaving(true);
    try {
      // Save SEO changes
      const seoSuccess = await onUpdateSEO(selectedPageId, metaTitle, metaDescription);
      
      // Save section changes if there are any
      const sectionsChanged = JSON.stringify(localSections) !== JSON.stringify(selectedPage?.sections_content || []);
      let sectionsSuccess = true;
      
      if (sectionsChanged) {
        sectionsSuccess = await onUpdateContent(selectedPageId, localSections);
      }
      
      if (seoSuccess && sectionsSuccess) {
        toast.success("Page settings saved!");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSectionsChange = (sections: SectionContent[]) => {
    setLocalSections(sections);
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-700";
      case "generated":
        return "bg-blue-100 text-blue-700";
      case "reviewed":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (pagesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">CMS Editor</h2>
          <p className="text-sm text-muted-foreground">Edit page SEO settings and content</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedPageId && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button 
                size="sm"
                onClick={handleSave} 
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Page List */}
        <div className="col-span-1">
          <Card className="h-[600px] flex flex-col">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredPages.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No pages found</p>
                  </div>
                ) : (
                  filteredPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => handleSelectPage(page.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors",
                        selectedPageId === page.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{page.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {Object.values(page.data_values || {}).slice(0, 2).join(", ")}
                          </p>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs flex-shrink-0", getStatusColor(page.status))}
                        >
                          {page.status}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="p-3 border-t text-xs text-muted-foreground">
              {filteredPages.length} of {pages.length} pages
            </div>
          </Card>
        </div>

        {/* Right: Editor */}
        <div className="col-span-2">
          {!selectedPageId ? (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-1">Select a page to edit</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a page from the list to edit its SEO settings
                </p>
              </div>
            </Card>
          ) : selectedPage ? (
            <Card className="h-[600px] flex flex-col">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{selectedPage.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(selectedPage.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={getStatusColor(selectedPage.status)}>
                    {selectedPage.status}
                  </Badge>
                </div>
              </div>
              
              <Tabs value={activeEditorTab} onValueChange={(v) => setActiveEditorTab(v as "seo" | "sections")} className="flex-1 flex flex-col min-h-0">
                <div className="border-b px-4">
                  <TabsList className="bg-transparent">
                    <TabsTrigger value="seo" className="gap-2">
                      <Settings className="h-4 w-4" />
                      SEO Settings
                    </TabsTrigger>
                    <TabsTrigger value="sections" className="gap-2">
                      <Layers className="h-4 w-4" />
                      Sections
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="seo" className="flex-1 m-0 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-6">
                      {/* SEO Preview */}
                      <div>
                        <Label className="text-sm font-medium mb-3 block">Google Search Preview</Label>
                        <div className="p-4 bg-white border rounded-lg space-y-1">
                          <p className="text-lg text-blue-700 hover:underline cursor-pointer truncate">
                            {metaTitle || selectedPage.title}
                          </p>
                          <p className="text-sm text-green-700">
                            {campaign.website_url || "https://yoursite.com"}/{generateSlug(selectedPage.title)}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {metaDescription || "No meta description set..."}
                          </p>
                        </div>
                      </div>

                      {/* Meta Title */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium">Meta Title</Label>
                          <span className={cn(
                            "text-xs",
                            metaTitle.length > 60 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {metaTitle.length}/60
                          </span>
                        </div>
                        <Input 
                          placeholder="Enter SEO title..."
                          value={metaTitle}
                          onChange={(e) => setMetaTitle(e.target.value)}
                          maxLength={70}
                        />
                      </div>

                      {/* Meta Description */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium">Meta Description</Label>
                          <span className={cn(
                            "text-xs",
                            metaDescription.length > 160 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {metaDescription.length}/160
                          </span>
                        </div>
                        <Textarea 
                          placeholder="Enter SEO description..."
                          value={metaDescription}
                          onChange={(e) => setMetaDescription(e.target.value)}
                          maxLength={200}
                          rows={3}
                          className="resize-none"
                        />
                      </div>

                      {/* Page Variables */}
                      <div>
                        <Label className="text-sm font-medium mb-3 block">Page Variables</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(selectedPage.data_values || {}).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                              <code className="font-mono text-primary text-xs">{`{{${key}}}`}</code>
                              <span className="text-foreground truncate">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="sections" className="flex-1 m-0 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <SectionEditor
                        sections={localSections}
                        onSectionsChange={handleSectionsChange}
                        dataValues={selectedPage.data_values || {}}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Preview Dialog */}
      {selectedPage && (
        <PagePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          page={selectedPage}
          campaign={campaign}
        />
      )}
    </div>
  );
}

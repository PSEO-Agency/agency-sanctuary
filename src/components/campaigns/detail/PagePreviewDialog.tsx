import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Code, Search, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB } from "@/hooks/useCampaignPages";
import { PagePreviewRenderer } from "./PagePreviewRenderer";
import { getTemplateForBusinessType, TemplateSection } from "@/lib/campaignTemplates";

interface PagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: CampaignPageDB | null;
  campaign: CampaignDB;
  onGenerateContent?: (pageId: string) => Promise<void>;
}

export function PagePreviewDialog({
  open,
  onOpenChange,
  page,
  campaign,
  onGenerateContent,
}: PagePreviewDialogProps) {
  const [activeTab, setActiveTab] = useState("preview");
  const [isGenerating, setIsGenerating] = useState(false);

  if (!page) return null;

  // Get template based on campaign business type
  const template = getTemplateForBusinessType(campaign.business_type || "local");

  // Merge campaign data with page-specific data
  const dataValues: Record<string, string> = {
    company: campaign.business_name || "Your Company",
    ...page.data_values,
  };

  const handleGenerate = async () => {
    if (!onGenerateContent) return;
    setIsGenerating(true);
    try {
      await onGenerateContent(page.id);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500";
      case "generated":
        return "bg-blue-500";
      case "reviewed":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  // Generate HTML source for preview
  const generateHTMLSource = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.meta_title || page.title}</title>
  <meta name="description" content="${page.meta_description || ""}">
</head>
<body>
  <!-- Hero Section -->
  <section class="hero">
    <h1>${page.title}</h1>
    <!-- Content will be rendered here -->
  </section>
  
  <!-- Additional sections... -->
</body>
</html>`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg">{page.title}</DialogTitle>
              <Badge 
                variant="secondary" 
                className={`${getStatusColor(page.status)} text-white`}
              >
                {page.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {page.status === "draft" && onGenerateContent && (
                <Button 
                  size="sm" 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Content
                </Button>
              )}
              {page.published_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={page.published_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Live
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-4">
            <TabsList className="bg-transparent">
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Visual Preview
              </TabsTrigger>
              <TabsTrigger value="html" className="gap-2">
                <Code className="h-4 w-4" />
                HTML Source
              </TabsTrigger>
              <TabsTrigger value="seo" className="gap-2">
                <Search className="h-4 w-4" />
                SEO Preview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-140px)]">
              <PagePreviewRenderer
                sections={template.sections}
                dataValues={dataValues}
                generatedContent={page.sections_content || []}
                businessName={campaign.business_name || undefined}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="html" className="flex-1 m-0 p-4 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-160px)]">
              <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">
                <code>{generateHTMLSource()}</code>
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="seo" className="flex-1 m-0 p-4 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-160px)]">
              <div className="max-w-2xl space-y-6">
                {/* Google Search Preview */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Google Search Preview</h3>
                  <div className="p-4 bg-white rounded-lg border space-y-1">
                    <p className="text-xl text-blue-700 hover:underline cursor-pointer">
                      {page.meta_title || page.title}
                    </p>
                    <p className="text-sm text-green-700">
                      {campaign.website_url || "https://yoursite.com"}/{generateSlug(page.title)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {page.meta_description || "No meta description set. Add one to improve your click-through rate from search results."}
                    </p>
                  </div>
                </div>

                {/* SEO Score */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">SEO Analysis</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Meta Title</span>
                      <Badge variant={page.meta_title ? "default" : "destructive"}>
                        {page.meta_title ? `${page.meta_title.length}/60 chars` : "Missing"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Meta Description</span>
                      <Badge variant={page.meta_description ? "default" : "destructive"}>
                        {page.meta_description ? `${page.meta_description.length}/160 chars` : "Missing"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Target Keywords</span>
                      <Badge variant={page.keywords?.length ? "default" : "secondary"}>
                        {page.keywords?.filter(k => k.selected).length || 0} selected
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Data Values */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Page Variables</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(page.data_values || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                        <span className="font-mono text-muted-foreground">{`{{${key}}}`}</span>
                        <span className="text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

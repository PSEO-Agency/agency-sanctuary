import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Code, Search, Loader2, Sparkles, ExternalLink, Settings2, CheckCircle2, Clock } from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB } from "@/hooks/useCampaignPages";
import { PagePreviewRenderer } from "./PagePreviewRenderer";
import { getTemplateForBusinessType } from "@/lib/campaignTemplates";
import { parseStaticPlaceholders, extractPrompts } from "@/lib/templateParser";

interface PagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: CampaignPageDB | null;
  campaign: CampaignDB;
  onGenerateContent?: (pageId: string) => Promise<void>;
  isGenerating?: boolean;
}

export function PagePreviewDialog({
  open,
  onOpenChange,
  page,
  campaign,
  onGenerateContent,
  isGenerating = false,
}: PagePreviewDialogProps) {
  const [activeTab, setActiveTab] = useState("setup");
  const [localGenerating, setLocalGenerating] = useState(false);

  if (!page) return null;

  const generating = isGenerating || localGenerating;

  // Get template based on campaign business type
  const template = getTemplateForBusinessType(campaign.business_type || "local");

  // Merge campaign data with page-specific data
  const dataValues: Record<string, string> = {
    company: campaign.business_name || "Your Company",
    ...page.data_values,
  };

  const handleGenerate = async () => {
    if (!onGenerateContent) return;
    setLocalGenerating(true);
    try {
      await onGenerateContent(page.id);
      setActiveTab("preview");
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setLocalGenerating(false);
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

  // Helper to get field content from sections_content
  const getFieldContentFromSection = (sectionId: string, fieldName: string): string => {
    const sectionsContent = page.sections_content || [];
    const section = sectionsContent.find(s => s.id === sectionId);
    if (section?.fields?.[fieldName]) {
      const field = section.fields[fieldName];
      if (field.isPrompt && field.generated) {
        return field.generated;
      }
      return field.rendered || "";
    }
    return "";
  };

  // Generate full HTML source with generated content
  const generateHTMLSource = () => {
    const sectionsContent = page.sections_content || [];
    const sectionHTML = sectionsContent.map(section => {
      // Build content from fields
      const fieldContents: string[] = [];
      if (section.fields) {
        for (const [key, field] of Object.entries(section.fields)) {
          const content = field.isPrompt && field.generated ? field.generated : field.rendered;
          if (content && !content.startsWith('[')) {
            if (key === 'items') {
              // Handle array fields
              try {
                const items = JSON.parse(content);
                if (Array.isArray(items)) {
                  fieldContents.push(`    <ul>\n${items.map(item => `      <li>${item}</li>`).join('\n')}\n    </ul>`);
                }
              } catch {
                fieldContents.push(`    <p>${content}</p>`);
              }
            } else if (key === 'headline' || key === 'title') {
              fieldContents.push(`    <h2>${content}</h2>`);
            } else {
              fieldContents.push(`    <p>${content}</p>`);
            }
          }
        }
      }
      
      return `  <!-- ${section.name || section.id} -->
  <section class="${section.type || section.id}">
${fieldContents.join('\n') || '    <!-- No content -->'}
  </section>`;
    }).join("\n\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.meta_title || page.title}</title>
  <meta name="description" content="${page.meta_description || ""}">
</head>
<body>
  <header>
    <h1>${parseStaticPlaceholders(page.title, dataValues)}</h1>
  </header>

${sectionHTML || "  <!-- No content generated yet -->"}

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${campaign.business_name || "Your Company"}</p>
  </footer>
</body>
</html>`;
  };

  // Extract all prompts from template for Setup tab
  const getAllPrompts = () => {
    const prompts: Array<{
      sectionId: string;
      sectionName: string;
      field: string;
      rawPrompt: string;
      resolvedPrompt: string;
      generatedContent: string | null;
    }> = [];

    template.sections.forEach(section => {
      Object.entries(section.content).forEach(([field, value]) => {
        if (typeof value === "string" && value.includes("prompt(")) {
          const extracted = extractPrompts(value, dataValues);
          extracted.forEach(p => {
            const sectionContent = page.sections_content?.find(s => s.id === section.id);
            // Get generated content from field-level storage
            const fieldData = sectionContent?.fields?.[field];
            const generatedContent = fieldData?.generated || null;
            
            prompts.push({
              sectionId: section.id,
              sectionName: section.name,
              field,
              rawPrompt: p.prompt,
              resolvedPrompt: p.placeholdersReplaced,
              generatedContent: generatedContent,
            });
          });
        }
      });
    });

    return prompts;
  };

  const prompts = getAllPrompts();
  const hasGeneratedContent = page.status === "generated" || page.status === "published" || page.status === "reviewed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg">{page.title}</DialogTitle>
              <Badge 
                variant="secondary" 
                className={`${getStatusColor(page.status)} text-white`}
              >
                {generating ? "Generating..." : page.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {page.status === "draft" && onGenerateContent && (
                <Button 
                  size="sm" 
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Content
                </Button>
              )}
              {hasGeneratedContent && onGenerateContent && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Regenerate
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="border-b px-4 flex-shrink-0">
            <TabsList className="bg-transparent">
              <TabsTrigger value="setup" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Setup
              </TabsTrigger>
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

          <TabsContent value="setup" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Page Variables */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Page Variables</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(page.data_values || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                        <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{`{{${key}}}`}</code>
                        <span className="text-foreground font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resolved Title */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Page Title (Resolved)</h3>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">{parseStaticPlaceholders(page.title, dataValues)}</p>
                  </div>
                </div>

                {/* AI Prompts */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    AI Generation Prompts ({prompts.length} total)
                  </h3>
                  <div className="space-y-4">
                    {prompts.map((prompt, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{prompt.sectionName}</Badge>
                            <span className="text-xs text-muted-foreground">{prompt.field}</span>
                          </div>
                          {prompt.generatedContent ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Generated
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="p-4 space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Resolved Prompt:</p>
                            <p className="text-sm bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-800">
                              "{prompt.resolvedPrompt}"
                            </p>
                          </div>
                          {prompt.generatedContent && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Generated Content:</p>
                              <p className="text-sm bg-green-50 dark:bg-green-950/30 p-2 rounded border border-green-200 dark:border-green-800">
                                {prompt.generatedContent.substring(0, 300)}
                                {prompt.generatedContent.length > 300 && "..."}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generation Status */}
                {!hasGeneratedContent && (
                  <div className="flex items-center justify-center p-8 bg-muted/30 rounded-lg border-2 border-dashed">
                    <div className="text-center">
                      <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="font-medium">Ready to Generate</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Click "Generate Content" to create AI-powered content for this page
                      </p>
                      <Button onClick={handleGenerate} disabled={generating}>
                        {generating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Generate Content
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full">
              <PagePreviewRenderer
                sections={template.sections}
                dataValues={dataValues}
                generatedContent={page.sections_content || []}
                businessName={campaign.business_name || undefined}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="html" className="flex-1 m-0 p-4 min-h-0">
            <ScrollArea className="h-full">
              <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                <code>{generateHTMLSource()}</code>
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="seo" className="flex-1 m-0 p-4 min-h-0">
            <ScrollArea className="h-full">
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
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Content Status</span>
                      <Badge variant={hasGeneratedContent ? "default" : "secondary"}>
                        {hasGeneratedContent ? "Generated" : "Pending"}
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

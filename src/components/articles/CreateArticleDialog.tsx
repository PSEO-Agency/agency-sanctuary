import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Loader2, Settings2, Search, Link, Image, CheckCircle, Globe, Sparkles } from "lucide-react";

export interface NewArticleConfig {
  approveEditSeoData: boolean;
  approveOutline: boolean;
  approveContent: boolean;
  seoNlpResearch: boolean;
  useTop10Serp: boolean;
  topicResearch: boolean;
  imageSelection: 'manual' | 'dynamic' | 'media_library' | 'api' | 'ai';
  addExternalLinks: boolean;
  externalLinksCount: number;
  addInternalLinks: boolean;
  internalLinksCount: number;
}

interface CreateArticleDialogProps {
  baseId: string;
  projectId: string;
  projectRecordId?: string | null;
  onArticleCreated: () => void;
}

const defaultConfig: NewArticleConfig = {
  approveEditSeoData: true,
  approveOutline: true,
  approveContent: true,
  seoNlpResearch: true,
  useTop10Serp: true,
  topicResearch: false,
  imageSelection: 'manual',
  addExternalLinks: true,
  externalLinksCount: 3,
  addInternalLinks: true,
  internalLinksCount: 3,
};

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'German', label: 'German' },
  { value: 'French', label: 'French' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Portuguese', label: 'Portuguese' },
];

export function CreateArticleDialog({ baseId, projectId, projectRecordId, onArticleCreated }: CreateArticleDialogProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [triggerWorkflow, setTriggerWorkflow] = useState(true);
  
  // Article basic info
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("English");
  
  // Configuration
  const [config, setConfig] = useState<NewArticleConfig>(defaultConfig);

  const updateConfig = (key: keyof NewArticleConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const handleCreate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic/keyword");
      return;
    }

    setCreating(true);
    try {
      // Create article in Airtable
      const { data, error } = await supabase.functions.invoke('create-airtable-article', {
        body: {
          baseId,
          fields: {
            name: topic.trim(),
            language,
            config,
            status: 'Draft',
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Article created successfully!");
        
        // Optionally trigger n8n workflow
        if (triggerWorkflow && data.record?.id) {
          try {
            await supabase.functions.invoke('trigger-n8n-workflow', {
              body: {
                projectId,
                articleId: data.record.id,
                action: 'start_pipeline',
                data: {
                  topic: topic.trim(),
                  language,
                  config,
                }
              }
            });
            toast.success("Content generation workflow triggered!");
          } catch (workflowError) {
            console.error("Failed to trigger workflow:", workflowError);
            toast.info("Article created, but workflow trigger failed. You can manually trigger it later.");
          }
        }
        
        setOpen(false);
        resetForm();
        onArticleCreated();
      } else {
        throw new Error(data.error || "Failed to create article");
      }
    } catch (err: any) {
      console.error("Error creating article:", err);
      toast.error(err.message || "Failed to create article");
    }
    setCreating(false);
  };

  const resetForm = () => {
    setTopic("");
    setLanguage("English");
    setConfig(defaultConfig);
    setTriggerWorkflow(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Article
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create New Article
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic / Keyword *</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Best SEO practices for 2024"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The main topic or target keyword for this article
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Approval Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="h-4 w-4 text-primary" />
                Approval Settings
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Configure which steps require manual approval
              </p>
              
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="approve-seo" className="text-sm text-muted-foreground cursor-pointer">
                    Approve/Edit SEO Data
                  </Label>
                  <Switch
                    id="approve-seo"
                    checked={config.approveEditSeoData}
                    onCheckedChange={(checked) => updateConfig('approveEditSeoData', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="approve-outline" className="text-sm text-muted-foreground cursor-pointer">
                    Approve Outline
                  </Label>
                  <Switch
                    id="approve-outline"
                    checked={config.approveOutline}
                    onCheckedChange={(checked) => updateConfig('approveOutline', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="approve-content" className="text-sm text-muted-foreground cursor-pointer">
                    Approve Content
                  </Label>
                  <Switch
                    id="approve-content"
                    checked={config.approveContent}
                    onCheckedChange={(checked) => updateConfig('approveContent', checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Research Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Search className="h-4 w-4 text-primary" />
                Research Settings
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Configure research sources for content generation
              </p>
              
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="seo-nlp" className="text-sm text-muted-foreground cursor-pointer">
                    SEO/NLP Research (Neuronwriter)
                  </Label>
                  <Switch
                    id="seo-nlp"
                    checked={config.seoNlpResearch}
                    onCheckedChange={(checked) => updateConfig('seoNlpResearch', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="top10-serp" className="text-sm text-muted-foreground cursor-pointer">
                    Use Top 10 SERP Data
                  </Label>
                  <Switch
                    id="top10-serp"
                    checked={config.useTop10Serp}
                    onCheckedChange={(checked) => updateConfig('useTop10Serp', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="topic-research" className="text-sm text-muted-foreground cursor-pointer">
                    Topic Research (AI)
                  </Label>
                  <Switch
                    id="topic-research"
                    checked={config.topicResearch}
                    onCheckedChange={(checked) => updateConfig('topicResearch', checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Image Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Image className="h-4 w-4 text-primary" />
                Image Selection
              </div>
              
              <div className="pl-6">
                <Select
                  value={config.imageSelection}
                  onValueChange={(value) => updateConfig('imageSelection', value as NewArticleConfig['imageSelection'])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select image source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="dynamic">Dynamic</SelectItem>
                    <SelectItem value="media_library">Media Library</SelectItem>
                    <SelectItem value="api">API (Unsplash/Pexels)</SelectItem>
                    <SelectItem value="ai">AI Generated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Link Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link className="h-4 w-4 text-primary" />
                Link Settings
              </div>
              
              <div className="space-y-4 pl-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="external-links" className="text-sm text-muted-foreground cursor-pointer">
                      Add External Links/Citations
                    </Label>
                    <Switch
                      id="external-links"
                      checked={config.addExternalLinks}
                      onCheckedChange={(checked) => updateConfig('addExternalLinks', checked)}
                    />
                  </div>
                  {config.addExternalLinks && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Number of links:</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={config.externalLinksCount}
                        onChange={(e) => updateConfig('externalLinksCount', parseInt(e.target.value) || 1)}
                        className="h-8 w-20"
                      />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="internal-links" className="text-sm text-muted-foreground cursor-pointer">
                      Add Internal Links
                    </Label>
                    <Switch
                      id="internal-links"
                      checked={config.addInternalLinks}
                      onCheckedChange={(checked) => updateConfig('addInternalLinks', checked)}
                    />
                  </div>
                  {config.addInternalLinks && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Number of links:</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={config.internalLinksCount}
                        onChange={(e) => updateConfig('internalLinksCount', parseInt(e.target.value) || 1)}
                        className="h-8 w-20"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Workflow Trigger */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Settings2 className="h-4 w-4 text-primary" />
                Automation
              </div>
              
              <div className="pl-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="trigger-workflow" className="text-sm cursor-pointer">
                      Start Content Generation Pipeline
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Trigger n8n workflow to generate SEO data, outline, and content
                    </p>
                  </div>
                  <Switch
                    id="trigger-workflow"
                    checked={triggerWorkflow}
                    onCheckedChange={setTriggerWorkflow}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !topic.trim()}>
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Article
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

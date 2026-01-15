import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Loader2, Search, Link, Image, Globe, Sparkles, FileEdit, Rocket, ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { ArticleStatusTracker } from "./ArticleStatusTracker";
import { useAuth } from "@/contexts/AuthContext";

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

type CreationMode = 'draft' | 'publish' | null;
type DialogStep = 'mode-select' | 'configure';

export function CreateArticleDialog({ baseId, projectId, projectRecordId, onArticleCreated }: CreateArticleDialogProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [triggerWorkflow, setTriggerWorkflow] = useState(true);
  
  // Multi-step state
  const [step, setStep] = useState<DialogStep>('mode-select');
  const [creationMode, setCreationMode] = useState<CreationMode>(null);
  
  // Status tracker state
  const [showStatusTracker, setShowStatusTracker] = useState(false);
  const [createdArticleId, setCreatedArticleId] = useState<string | null>(null);
  const [createdArticleName, setCreatedArticleName] = useState<string>("");
  
  // Article basic info
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("English");
  
  // Configuration
  const [config, setConfig] = useState<NewArticleConfig>(defaultConfig);
  
  // Advanced settings collapsed state
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const updateConfig = (key: keyof NewArticleConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const handleModeSelect = (mode: CreationMode) => {
    if (mode === 'publish') {
      // Coming soon - don't allow selection
      return;
    }
    setCreationMode(mode);
    setStep('configure');
  };

  const handleBack = () => {
    setStep('mode-select');
    setCreationMode(null);
  };

  const handleCreate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic/keyword");
      return;
    }

    setCreating(true);
    try {
      // Create article in Airtable with project link and creator info
      const { data, error } = await supabase.functions.invoke('create-airtable-article', {
        body: {
          baseId,
          projectRecordId,
          fields: {
            name: topic.trim(),
            language,
            config,
            status: 'Draft',
            createdByName: profile?.full_name || profile?.email || 'Unknown',
            createdByEmail: profile?.email || null,
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Article created successfully!");
        
        // Store article info for status tracker
        const articleId = data.record?.id;
        setCreatedArticleId(articleId);
        setCreatedArticleName(topic.trim());
        
        // Optionally trigger n8n workflow
        if (triggerWorkflow && articleId) {
          try {
            await supabase.functions.invoke('trigger-n8n-workflow', {
              body: {
                projectId,
                articleId: articleId,
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
        
        // Show status tracker after article is created
        if (articleId) {
          setShowStatusTracker(true);
        }
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
    setCreatedArticleId(null);
    setCreatedArticleName("");
    setStep('mode-select');
    setCreationMode(null);
    setAdvancedOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleViewArticle = () => {
    if (createdArticleId) {
      setShowStatusTracker(false);
      navigate(`/subaccount/${projectId}/article/${createdArticleId}`);
    }
  };

  // Progressive disclosure logic for approval settings
  const showAutoApproveContent = !config.approveOutline;
  const showApproveSeoData = showAutoApproveContent && !config.approveContent;

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
        
        {step === 'mode-select' && (
          <div className="py-6">
            <p className="text-sm text-muted-foreground text-center mb-6">
              Choose how you'd like to create your article
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* Create as Draft */}
              <Card
                className="p-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center text-center gap-3 min-h-[160px]"
                onClick={() => handleModeSelect('draft')}
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileEdit className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Create as Draft</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure and review before publishing
                  </p>
                </div>
              </Card>

              {/* Create & Publish - Coming Soon */}
              <Card
                className="p-6 cursor-not-allowed opacity-60 flex flex-col items-center justify-center text-center gap-3 min-h-[160px] relative"
              >
                <Badge variant="secondary" className="absolute top-2 right-2 text-[10px]">
                  Coming Soon
                </Badge>
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Rocket className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium text-muted-foreground">Create & Publish</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fully automated publishing
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
            <div className="space-y-5 py-4">
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

              {/* Approval Settings - Progressive Disclosure */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-medium">Approval Settings</h4>
                
                {/* Auto-approve Outline (shown first) */}
                <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                  <Label htmlFor="auto-approve-outline" className="text-sm cursor-pointer">
                    Auto-approve Outline
                  </Label>
                  <Switch
                    id="auto-approve-outline"
                    checked={!config.approveOutline}
                    onCheckedChange={(checked) => {
                      updateConfig('approveOutline', !checked);
                      // Reset downstream settings when turning off
                      if (!checked) {
                        updateConfig('approveContent', true);
                        updateConfig('approveEditSeoData', true);
                      }
                    }}
                  />
                </div>

                {/* Auto-approve Content (appears when Outline is auto-approved) */}
                {showAutoApproveContent && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 animate-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="auto-approve-content" className="text-sm cursor-pointer">
                      Auto-approve Content
                    </Label>
                    <Switch
                      id="auto-approve-content"
                      checked={!config.approveContent}
                      onCheckedChange={(checked) => {
                        updateConfig('approveContent', !checked);
                        // Reset SEO approval when turning off
                        if (!checked) {
                          updateConfig('approveEditSeoData', true);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Approve/Edit SEO Data (appears when Content is auto-approved) */}
                {showApproveSeoData && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 animate-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="approve-seo-data" className="text-sm cursor-pointer">
                      Approve/Edit SEO Data
                    </Label>
                    <Switch
                      id="approve-seo-data"
                      checked={config.approveEditSeoData}
                      onCheckedChange={(checked) => updateConfig('approveEditSeoData', checked)}
                    />
                  </div>
                )}
              </div>

              {/* Advanced Settings - Collapsible */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full py-2">
                  {advancedOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Settings2 className="h-4 w-4" />
                  Advanced Settings
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  {/* Research Settings */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Search className="h-3.5 w-3.5" />
                      Research Settings
                    </div>
                    
                    <div className="space-y-2 pl-5">
                      <div className="flex items-center justify-between py-1.5">
                        <Label htmlFor="seo-nlp" className="text-sm text-muted-foreground cursor-pointer">
                          SEO/NLP Research (Neuronwriter)
                        </Label>
                        <Switch
                          id="seo-nlp"
                          checked={config.seoNlpResearch}
                          onCheckedChange={(checked) => updateConfig('seoNlpResearch', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between py-1.5">
                        <Label htmlFor="top10-serp" className="text-sm text-muted-foreground cursor-pointer">
                          Use Top 10 SERP Data
                        </Label>
                        <Switch
                          id="top10-serp"
                          checked={config.useTop10Serp}
                          onCheckedChange={(checked) => updateConfig('useTop10Serp', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between py-1.5">
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

                  {/* Image Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Image className="h-3.5 w-3.5" />
                      Image Selection
                    </div>
                    
                    <div className="pl-5">
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

                  {/* Link Settings */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Link className="h-3.5 w-3.5" />
                      Link Settings
                    </div>
                    
                    <div className="space-y-3 pl-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1.5">
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
                          <div className="flex items-center gap-2 pl-4">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Number of links:</Label>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={config.externalLinksCount}
                              onChange={(e) => updateConfig('externalLinksCount', parseInt(e.target.value) || 1)}
                              className="h-7 w-16 text-sm"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1.5">
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
                          <div className="flex items-center gap-2 pl-4">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Number of links:</Label>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={config.internalLinksCount}
                              onChange={(e) => updateConfig('internalLinksCount', parseInt(e.target.value) || 1)}
                              className="h-7 w-16 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Automation */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                    <div>
                      <Label htmlFor="trigger-workflow" className="text-sm cursor-pointer">
                        Start Content Pipeline
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Auto-generate SEO data, outline, and content
                      </p>
                    </div>
                    <Switch
                      id="trigger-workflow"
                      checked={triggerWorkflow}
                      onCheckedChange={setTriggerWorkflow}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        )}

        {step === 'configure' && (
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={handleBack}>
              Back
            </Button>
            <div className="flex gap-2">
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
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Status Tracker Modal */}
    <ArticleStatusTracker
      open={showStatusTracker}
      onOpenChange={setShowStatusTracker}
      baseId={baseId}
      recordId={createdArticleId || ""}
      projectId={projectId}
      articleName={createdArticleName}
      onViewArticle={handleViewArticle}
    />
    </>
  );
}

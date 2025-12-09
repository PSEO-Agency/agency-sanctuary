import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Loader2, Eye, Code, FileText, Settings, Sliders } from "lucide-react";
import { toast } from "sonner";
import { ArticleEditorHeader } from "@/components/articles/editor/ArticleEditorHeader";
import { ArticleSEOPanel } from "@/components/articles/editor/ArticleSEOPanel";
import { ArticleSectionsEditor } from "@/components/articles/editor/ArticleSectionsEditor";
import { ArticleHTMLPreview } from "@/components/articles/editor/ArticleHTMLPreview";
import { ArticleOutlinePanel } from "@/components/articles/editor/ArticleOutlinePanel";
import { ArticleConfigPanel, type ArticleConfig } from "@/components/articles/editor/ArticleConfigPanel";
import type { Article } from "@/components/articles/ArticleRow";

const defaultConfig: ArticleConfig = {
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

export default function ArticleEditor() {
  const { subaccountId, projectId, articleId } = useParams();
  const navigate = useNavigate();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  
  // Editable fields
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [outline, setOutline] = useState("");
  const [config, setConfig] = useState<ArticleConfig>(defaultConfig);
  const [baseId, setBaseId] = useState<string>("");

  useEffect(() => {
    if (articleId && projectId) {
      fetchArticle();
    }
  }, [articleId, projectId]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
      // First get the project to get the base ID
      const { data: project, error: projectError } = await supabase
        .from('blog_projects')
        .select('airtable_base_id')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      setBaseId(project.airtable_base_id);

      // Fetch articles from Airtable
      const { data, error } = await supabase.functions.invoke('fetch-airtable-articles', {
        body: { baseId: project.airtable_base_id }
      });

      if (error) throw error;

      if (data.success) {
        const foundArticle = data.articles.find((a: Article) => a.id === articleId);
        if (foundArticle) {
          setArticle(foundArticle);
          setMetaTitle(foundArticle.metaTitle || "");
          setMetaDescription(foundArticle.metaDescription || "");
          setSlug(foundArticle.slug || "");
          setContent(foundArticle.content || "");
          setOutline(foundArticle.outline || "");
          // Parse config from article if it exists
          if (foundArticle.config) {
            try {
              const parsedConfig = typeof foundArticle.config === 'string' 
                ? JSON.parse(foundArticle.config) 
                : foundArticle.config;
              setConfig({ ...defaultConfig, ...parsedConfig });
            } catch (e) {
              console.log('Could not parse article config, using defaults');
            }
          }
        } else {
          toast.error("Article not found");
          navigate(`/subaccount/${subaccountId}/projects`);
        }
      }
    } catch (err: any) {
      console.error("Error fetching article:", err);
      toast.error("Failed to load article");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!baseId || !articleId) {
      toast.error("Missing required data to save");
      return;
    }
    
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-airtable-article', {
        body: {
          baseId,
          recordId: articleId,
          fields: {
            metaTitle,
            metaDescription,
            slug,
            content,
            outline,
            config,
          }
        }
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success("Changes saved to Airtable");
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (err: any) {
      console.error("Error saving article:", err);
      toast.error(err.message || "Failed to save changes");
    }
    setSaving(false);
  };

  const handleBack = () => {
    navigate(`/subaccount/${subaccountId}/projects`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Article not found</p>
          <Button onClick={handleBack} variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-4 w-px bg-border" />
            <h1 className="font-semibold truncate max-w-[400px]">{article.name}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-56px)]">
        {/* Left Panel - SEO & Outline */}
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          <Tabs defaultValue="seo" className="flex-1 flex flex-col">
            <TabsList className="m-2 grid grid-cols-3">
              <TabsTrigger value="seo" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                SEO
              </TabsTrigger>
              <TabsTrigger value="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Outline
              </TabsTrigger>
              <TabsTrigger value="config" className="text-xs">
                <Sliders className="h-3 w-3 mr-1" />
                Config
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="seo" className="flex-1 m-0 overflow-auto">
              <ArticleSEOPanel
                article={article}
                metaTitle={metaTitle}
                setMetaTitle={setMetaTitle}
                metaDescription={metaDescription}
                setMetaDescription={setMetaDescription}
                slug={slug}
                setSlug={setSlug}
              />
            </TabsContent>
            
            <TabsContent value="outline" className="flex-1 m-0 overflow-auto">
              <ArticleOutlinePanel
                outline={outline}
                setOutline={setOutline}
              />
            </TabsContent>
            
            <TabsContent value="config" className="flex-1 m-0 overflow-auto">
              <ArticleConfigPanel
                config={config}
                setConfig={setConfig}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Center Panel - Content Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b px-4 py-2 bg-background">
              <TabsList>
                <TabsTrigger value="content" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="html" className="gap-2">
                  <Code className="h-4 w-4" />
                  HTML
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="content" className="flex-1 m-0 overflow-auto">
              <ArticleSectionsEditor
                content={content}
                setContent={setContent}
              />
            </TabsContent>
            
            <TabsContent value="preview" className="flex-1 m-0 overflow-auto bg-white">
              <ArticleHTMLPreview
                html={article.html}
                content={content}
                metaTitle={metaTitle}
              />
            </TabsContent>
            
            <TabsContent value="html" className="flex-1 m-0 overflow-auto">
              <div className="p-4">
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap">
                  {article.html || "<p>No HTML content available</p>"}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Stats */}
        <div className="w-64 border-l bg-muted/30 p-4 overflow-auto">
          <ArticleEditorHeader article={article} />
        </div>
      </div>
    </div>
  );
}

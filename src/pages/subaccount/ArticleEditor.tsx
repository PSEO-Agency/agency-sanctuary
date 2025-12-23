import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronRight, 
  Copy, 
  RefreshCw, 
  Send, 
  Loader2,
  ChevronDown,
  HelpCircle,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Article } from "@/components/articles/ArticleRow";

// Convert markdown-like content to HTML for preview
const convertContentToHTML = (content: string): string => {
  if (!content) return '';
  
  return content
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      
      // Headers
      if (trimmed.startsWith('## ')) {
        return `<h2 class="text-2xl font-bold mt-8 mb-4">${trimmed.slice(3)}</h2>`;
      }
      if (trimmed.startsWith('### ')) {
        return `<h3 class="text-xl font-semibold mt-6 mb-3">${trimmed.slice(4)}</h3>`;
      }
      
      // Regular paragraph
      return `<p class="text-base leading-relaxed mb-4 text-muted-foreground">${trimmed}</p>`;
    })
    .filter(Boolean)
    .join('');
};

const getStatusStyle = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('published')) return { dot: 'bg-green-500', text: 'text-green-700' };
  if (statusLower.includes('generated') || statusLower.includes('ready') || statusLower.includes('complete')) return { dot: 'bg-green-500', text: 'text-green-700' };
  if (statusLower.includes('draft')) return { dot: 'bg-gray-400', text: 'text-gray-600' };
  if (statusLower.includes('processing') || statusLower.includes('generate')) return { dot: 'bg-yellow-500', text: 'text-yellow-700' };
  return { dot: 'bg-gray-400', text: 'text-gray-600' };
};

const getScoreGrade = (score: number | null) => {
  if (!score) return { grade: '-', color: 'text-muted-foreground', bg: 'bg-muted' };
  if (score >= 90) return { grade: 'A+', color: 'text-green-600', bg: 'border-green-500' };
  if (score >= 80) return { grade: 'A', color: 'text-green-600', bg: 'border-green-500' };
  if (score >= 70) return { grade: 'B', color: 'text-blue-600', bg: 'border-blue-500' };
  if (score >= 60) return { grade: 'C', color: 'text-yellow-600', bg: 'border-yellow-500' };
  return { grade: 'D', color: 'text-red-600', bg: 'border-red-500' };
};

export default function ArticleEditor() {
  const { subaccountId, projectId, articleId } = useParams();
  const navigate = useNavigate();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  
  // Editable fields
  const [content, setContent] = useState("");
  const [baseId, setBaseId] = useState<string>("");
  
  // Collapsible states
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(true);

  useEffect(() => {
    if (articleId && projectId && subaccountId) {
      fetchArticle();
    }
  }, [articleId, projectId, subaccountId]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
      // Fetch subaccount to get the airtable_base_id
      const { data: subaccount, error: subaccountError } = await supabase
        .from('subaccounts')
        .select('airtable_base_id')
        .eq('id', subaccountId)
        .single();

      if (subaccountError) throw subaccountError;
      
      if (!subaccount.airtable_base_id) {
        toast.error("No Airtable base configured for this subaccount");
        navigate(`/subaccount/${subaccountId}/projects`);
        return;
      }

      setBaseId(subaccount.airtable_base_id);

      const { data, error } = await supabase.functions.invoke('fetch-airtable-articles', {
        body: { baseId: subaccount.airtable_base_id }
      });

      if (error) throw error;

      if (data.success) {
        const foundArticle = data.articles.find((a: Article) => a.id === articleId);
        if (foundArticle) {
          setArticle(foundArticle);
          setContent(foundArticle.content || "");
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
          fields: { content }
        }
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success("Changes saved");
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (err: any) {
      console.error("Error saving article:", err);
      toast.error(err.message || "Failed to save changes");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Article not found</p>
          <Button 
            onClick={() => navigate(`/subaccount/${subaccountId}/projects`)} 
            variant="outline" 
            className="mt-4"
          >
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusStyle(article.status);
  const scoreInfo = getScoreGrade(article.contentScore);
  const creatorInitial = article.createdBy?.[0]?.charAt(0)?.toUpperCase() || 'A';
  
  const formattedDate = article.createdAt 
    ? new Date(article.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    : '-';

  return (
    <div className="h-full flex flex-col -m-6">
      {/* Top Header Bar */}
      <div className="border-b bg-background px-6 py-3 flex items-center justify-between">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link 
            to={`/subaccount/${subaccountId}/projects`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Articles
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium truncate max-w-[400px]">{article.name}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Copy className="h-4 w-4" />
            Copy
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Regenerate
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
            <Send className="h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Tabs */}
          <div className="border-b px-6 pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-transparent p-0 h-auto gap-4">
                <TabsTrigger 
                  value="editor" 
                  className="px-4 py-2 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Editor
                </TabsTrigger>
                <TabsTrigger 
                  value="brief" 
                  className="px-4 py-2 rounded-full text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Content brief
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Editor Content */}
          <div className="p-6">
            {activeTab === "editor" && (
              <div className="max-w-3xl mx-auto">
                {/* Featured Image */}
                {article.imageUrl && (
                  <div className="rounded-lg overflow-hidden mb-8">
                    <img 
                      src={article.imageUrl} 
                      alt={article.name}
                      className="w-full h-72 object-cover"
                    />
                  </div>
                )}

                {/* Title */}
                <h1 className="text-3xl font-bold text-foreground mb-4">{article.name}</h1>

                {/* Meta Description */}
                {article.metaDescription && (
                  <p className="text-base text-muted-foreground leading-relaxed mb-6">
                    {article.metaDescription}
                  </p>
                )}

                {/* Separator */}
                <div className="border-t my-8" />

                {/* Content - rendered as clean preview */}
                <article 
                  className="prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: convertContentToHTML(content) }}
                />
              </div>
            )}

            {activeTab === "brief" && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-muted/30 rounded-lg p-8 text-center">
                  <p className="text-muted-foreground">Content brief coming soon...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 border-l bg-background overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Content Grade */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                Content Grade
                <HelpCircle className="h-3.5 w-3.5" />
              </div>
              <div className={`w-10 h-10 rounded-lg border-2 ${scoreInfo.bg} flex items-center justify-center`}>
                <span className={`text-lg font-bold ${scoreInfo.color}`}>
                  {scoreInfo.grade}
                </span>
              </div>
            </div>

            {/* Details Section */}
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
                Details
                <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? '' : '-rotate-90'}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {/* Status */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className={`${statusStyle.text} font-normal gap-1.5`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                    {article.status}
                  </Badge>
                </div>

                {/* Created by */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created by</span>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {creatorInitial}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Created */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <Badge variant="outline" className="font-normal">
                    {formattedDate}
                  </Badge>
                </div>

                {/* Generated */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Generated</span>
                  <Badge variant="outline" className="font-normal">
                    {formattedDate}
                  </Badge>
                </div>

                {/* Updated */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Updated</span>
                  <Badge variant="outline" className="font-normal text-primary">
                    {formattedDate}
                  </Badge>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Stats Section */}
            <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-t pt-4">
                Stats
                <ChevronDown className={`h-4 w-4 transition-transform ${statsOpen ? '' : '-rotate-90'}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Word Count</span>
                  <span className="font-medium">{article.wordCount?.toLocaleString() || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Readability</span>
                  <span className="font-medium">{article.readability || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Language</span>
                  <span className="font-medium">{article.language}</span>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Article Content Section */}
            <Collapsible open={contentOpen} onOpenChange={setContentOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-t pt-4">
                Article Content
                <ChevronDown className={`h-4 w-4 transition-transform ${contentOpen ? '' : '-rotate-90'}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="text-sm text-muted-foreground">
                  {article.outline ? (
                    <div className="space-y-1">
                      {article.outline.split('\n').slice(0, 5).map((line, i) => (
                        <p key={i} className="truncate">{line}</p>
                      ))}
                    </div>
                  ) : (
                    <p>No outline available</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Saved indicator */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-600" />
                Saved
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

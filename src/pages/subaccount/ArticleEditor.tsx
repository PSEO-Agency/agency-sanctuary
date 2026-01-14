import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import DOMPurify from "dompurify";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronRight, 
  Copy, 
  RefreshCw, 
  Loader2,
  ChevronDown,
  HelpCircle,
  Check,
  Pencil,
  Save,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Article } from "@/components/articles/ArticleRow";
import { ArticleActionButtons } from "@/components/articles/ArticleActionButtons";
import { RichTextEditor } from "@/components/RichTextEditor";

// Convert markdown-like content to HTML for preview and editing
const convertContentToHTML = (content: string): string => {
  if (!content) return '';
  
  // Process inline markdown first
  const processInline = (text: string): string => {
    return text
      // Bold: **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Italic: *text* or _text_
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Links: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  };

  const lines = content.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) {
      if (inList) {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      continue;
    }

    // Headers
    if (trimmed.startsWith('## ')) {
      if (inList) {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      result.push(`<h2>${processInline(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('### ')) {
      if (inList) {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      result.push(`<h3>${processInline(trimmed.slice(4))}</h3>`);
      continue;
    }

    // Unordered list items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push('</ol>');
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      result.push(`<li>${processInline(trimmed.slice(2))}</li>`);
      continue;
    }

    // Ordered list items
    const orderedMatch = trimmed.match(/^\d+\.\s(.+)$/);
    if (orderedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push('</ul>');
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      result.push(`<li>${processInline(orderedMatch[1])}</li>`);
      continue;
    }

    // Regular paragraph
    if (inList) {
      result.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }
    result.push(`<p>${processInline(trimmed)}</p>`);
  }

  if (inList) {
    result.push(listType === 'ul' ? '</ul>' : '</ol>');
  }

  return result.join('');
};

const getStatusStyle = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('published')) return { dot: 'bg-green-500', text: 'text-green-700' };
  if (statusLower === 'article ready') return { dot: 'bg-green-500', text: 'text-green-700' };
  if (statusLower === 'outline ready') return { dot: 'bg-blue-500', text: 'text-blue-700' };
  if (statusLower === 'research done') return { dot: 'bg-blue-500', text: 'text-blue-700' };
  if (statusLower.includes('draft')) return { dot: 'bg-gray-400', text: 'text-gray-600' };
  if (statusLower.includes('processing') || statusLower.includes('generate') || statusLower.includes('start research')) return { dot: 'bg-yellow-500', text: 'text-yellow-700' };
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
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Editable fields - content is raw markdown, htmlContent is for the editor
  const [content, setContent] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [originalHtmlContent, setOriginalHtmlContent] = useState("");
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
        toast.error("Account setup is still in progress");
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
          // Convert markdown to HTML for the editor
          const html = convertContentToHTML(foundArticle.content || "");
          setHtmlContent(html);
          setOriginalHtmlContent(html);
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
      // Save the HTML content directly (Airtable can store HTML)
      const { data, error } = await supabase.functions.invoke('update-airtable-article', {
        body: {
          baseId,
          recordId: articleId,
          fields: { content: htmlContent }
        }
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success("Changes saved to Airtable");
        setOriginalHtmlContent(htmlContent);
        setContent(htmlContent); // Update raw content too
        setHasChanges(false);
        setIsEditing(false);
        // Update local article state with new content
        if (article) {
          setArticle({ ...article, content: htmlContent });
        }
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (err: any) {
      console.error("Error saving article:", err);
      toast.error(err.message || "Failed to save changes");
    }
    setSaving(false);
  };

  const handleContentChange = (newHtml: string) => {
    setHtmlContent(newHtml);
    setHasChanges(newHtml !== originalHtmlContent);
  };

  const handleCancelEdit = () => {
    setHtmlContent(originalHtmlContent);
    setHasChanges(false);
    setIsEditing(false);
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
  const creatorName = article.createdBy?.[0] || 'Unknown';
  const creatorInitial = creatorName.charAt(0).toUpperCase();
  
  const formattedDate = article.createdAt 
    ? new Date(article.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    : '-';

  const handleStatusChange = (newStatus: string) => {
    if (article) {
      setArticle({ ...article, status: newStatus });
    }
    // Refetch to get latest data after status change
    setTimeout(() => fetchArticle(), 1000);
  };

  const handleArticleUpdate = (updatedArticle: Article) => {
    setArticle(updatedArticle);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col -m-6 overflow-hidden">
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
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                className="gap-2"
                onClick={handleSave}
                disabled={saving || !hasChanges}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
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
              
              {/* Dynamic Action Buttons based on status */}
              <ArticleActionButtons
                article={article}
                baseId={baseId}
                onStatusChange={handleStatusChange}
                onArticleUpdate={handleArticleUpdate}
              />
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-120px)]">
        {/* Center Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs - Fixed */}
          <div className="border-b px-6 pt-4 flex-shrink-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-transparent p-0 h-auto gap-4">
                <TabsTrigger 
                  value="editor" 
                  className="px-4 py-2 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Article
                </TabsTrigger>
                <TabsTrigger 
                  value="seo" 
                  className="px-4 py-2 rounded-full text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  SEO Settings
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Editor Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
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

                {/* Content - editable or preview */}
                {isEditing ? (
                  <RichTextEditor
                    content={htmlContent}
                    onChange={handleContentChange}
                    placeholder="Start writing your article content..."
                  />
                ) : (
                  <article 
                    className="prose prose-slate max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(convertContentToHTML(content), {
                      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'br', 'span', 'div'],
                      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel']
                    }) }}
                  />
                )}
              </div>
            )}

            {activeTab === "seo" && (
              <div className="max-w-3xl mx-auto space-y-8">
                {/* Featured Image */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Featured Image</label>
                  {article.imageUrl ? (
                    <div className="rounded-lg overflow-hidden border">
                      <img 
                        src={article.imageUrl} 
                        alt={article.name}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed bg-muted/30 h-48 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">No featured image</p>
                    </div>
                  )}
                </div>

                {/* Meta Title */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Meta Title</label>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-foreground">{article.metaTitle || <span className="text-muted-foreground italic">No meta title set</span>}</p>
                  </div>
                  {article.metaTitle && (
                    <p className="text-xs text-muted-foreground">{article.metaTitle.length} / 60 characters</p>
                  )}
                </div>

                {/* Meta Description */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Meta Description</label>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-foreground">{article.metaDescription || <span className="text-muted-foreground italic">No meta description set</span>}</p>
                  </div>
                  {article.metaDescription && (
                    <p className="text-xs text-muted-foreground">{article.metaDescription.length} / 160 characters</p>
                  )}
                </div>

                {/* SEO Outline */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">SEO Outline</label>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    {article.outline ? (
                      <div 
                        className="prose prose-sm max-w-none text-foreground"
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(convertContentToHTML(article.outline), {
                            ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'br'],
                            ALLOWED_ATTR: ['class']
                          }) 
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground italic">No SEO outline available</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Scrollable */}
        <div className="w-72 border-l bg-background overflow-y-auto flex-shrink-0">
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

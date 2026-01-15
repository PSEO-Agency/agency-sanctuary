import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText } from "lucide-react";
import { ArticleRow, type Article } from "./ArticleRow";
import { Checkbox } from "@/components/ui/checkbox";

interface ArticlesTableProps {
  baseId: string;
  isOpen: boolean;
  projectId: string;
  projectRecordId?: string | null;
  searchQuery?: string;
  statusFilter?: string;
  viewMode?: "simple" | "full";
}

// Processing statuses that should trigger auto-refresh
const PROCESSING_STATUSES = ['start research', 'generate outline', 'generate article'];

const hasProcessingArticles = (articles: Article[]): boolean => {
  return articles.some(article => 
    PROCESSING_STATUSES.includes(article.status.toLowerCase())
  );
};

export function ArticlesTable({ 
  baseId, 
  isOpen, 
  projectId,
  projectRecordId, 
  searchQuery = "", 
  statusFilter = "all",
  viewMode = "simple" 
}: ArticlesTableProps) {
  const { subaccountId } = useParams();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset and refetch when baseId or projectRecordId changes
  useEffect(() => {
    setHasFetched(false);
    setArticles([]);
    setSelectedIds(new Set());
  }, [baseId, projectRecordId]);

  useEffect(() => {
    if (isOpen && !hasFetched) {
      fetchArticles();
    }
  }, [isOpen, hasFetched, baseId, projectRecordId]);

  const fetchArticles = useCallback(async (isPolling = false) => {
    if (!isPolling) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-airtable-articles', {
        body: { baseId, projectRecordId }
      });

      if (error) throw error;

      if (data.success) {
        setArticles(data.articles || []);
        setHasFetched(true);
      } else {
        setError(data.error || 'Failed to fetch articles');
      }
    } catch (err: any) {
      console.error('Error fetching articles:', err);
      setError(err.message || 'Failed to fetch articles');
    }
    
    if (!isPolling) {
      setLoading(false);
    }
  }, [baseId, projectRecordId]);

  // Auto-refresh polling when articles are in processing state
  useEffect(() => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Only poll if there are processing articles
    if (isOpen && hasFetched && hasProcessingArticles(articles)) {
      console.log('Starting auto-refresh polling for processing articles...');
      pollingIntervalRef.current = setInterval(() => {
        console.log('Polling for article status updates...');
        fetchArticles(true);
      }, 10000); // Poll every 10 seconds
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isOpen, hasFetched, articles, fetchArticles]);

  const handleOpenEditor = (article: Article) => {
    navigate(`/subaccount/${subaccountId}/projects/${projectId}/articles/${article.id}`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredArticles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredArticles.map(a => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleStatusChange = (articleId: string, newStatus: string) => {
    setArticles(prev => prev.map(a => 
      a.id === articleId ? { ...a, status: newStatus } : a
    ));
  };

  const handleArticleUpdate = (updatedArticle: Article) => {
    setArticles(prev => prev.map(a => 
      a.id === updatedArticle.id ? updatedArticle : a
    ));
  };

  // Filter articles
  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchQuery === "" || 
      article.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.slug?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      article.status.toLowerCase().includes(statusFilter.toLowerCase());
    
    return matchesSearch && matchesStatus;
  });

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading articles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="py-8 text-center">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No articles found in this project</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[40px] py-2">
              <Checkbox 
                checked={selectedIds.size === filteredArticles.length && filteredArticles.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="py-2 text-xs font-medium text-muted-foreground">Article</TableHead>
            <TableHead className="py-2 text-xs font-medium text-muted-foreground">Status</TableHead>
            <TableHead className="py-2 text-xs font-medium text-muted-foreground">Actions</TableHead>
            <TableHead className="py-2 text-xs font-medium text-muted-foreground">Created by</TableHead>
            <TableHead className="py-2 text-xs font-medium text-muted-foreground">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredArticles.map((article) => (
            <ArticleRow
              key={article.id}
              article={article}
              onSelect={handleOpenEditor}
              isSelected={selectedIds.has(article.id)}
              onToggleSelect={() => toggleSelect(article.id)}
              viewMode={viewMode}
              baseId={baseId}
              onStatusChange={handleStatusChange}
              onArticleUpdate={handleArticleUpdate}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
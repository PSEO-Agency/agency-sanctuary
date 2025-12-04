import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText } from "lucide-react";
import { ArticleRow, type Article } from "./ArticleRow";
import { ArticleSidePanel } from "./ArticleSidePanel";

interface ArticlesTableProps {
  baseId: string;
  isOpen: boolean;
}

export function ArticlesTable({ baseId, isOpen }: ArticlesTableProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (isOpen && !hasFetched) {
      fetchArticles();
    }
  }, [isOpen, hasFetched, baseId]);

  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-airtable-articles', {
        body: { baseId }
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
    
    setLoading(false);
  };

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
    <div className="flex">
      <div className={`flex-1 transition-all ${selectedArticle ? 'pr-0' : ''}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Article Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[60px]">Lang</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((article) => (
              <ArticleRow
                key={article.id}
                article={article}
                onSelect={setSelectedArticle}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      
      {selectedArticle && (
        <ArticleSidePanel
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  );
}

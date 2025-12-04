import { X, FileText, Link2, Hash, AlignLeft, BarChart2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Article } from "./ArticleRow";

interface ArticleSidePanelProps {
  article: Article | null;
  onClose: () => void;
}

const getScoreGrade = (score: number | null) => {
  if (!score) return { grade: '-', color: 'text-muted-foreground' };
  if (score >= 90) return { grade: 'A+', color: 'text-green-500' };
  if (score >= 80) return { grade: 'A', color: 'text-green-500' };
  if (score >= 70) return { grade: 'B', color: 'text-blue-500' };
  if (score >= 60) return { grade: 'C', color: 'text-yellow-500' };
  return { grade: 'D', color: 'text-red-500' };
};

export function ArticleSidePanel({ article, onClose }: ArticleSidePanelProps) {
  if (!article) return null;

  const scoreInfo = getScoreGrade(article.contentScore);

  return (
    <div className="w-[400px] border-l bg-background h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg truncate pr-4">{article.name}</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Hero Image */}
          {article.imageUrl && (
            <div className="rounded-lg overflow-hidden border">
              <img 
                src={article.imageUrl} 
                alt={article.name}
                className="w-full h-40 object-cover"
              />
            </div>
          )}

          {/* Content Score */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Content Grade</span>
            </div>
            <span className={`text-2xl font-bold ${scoreInfo.color}`}>
              {scoreInfo.grade}
            </span>
          </div>

          <Separator />

          {/* SEO Metadata */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              SEO Metadata
            </h4>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Slug
                </label>
                <p className="text-sm bg-muted/50 px-3 py-2 rounded font-mono">
                  {article.slug || '-'}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Meta Title
                </label>
                <p className="text-sm bg-muted/50 px-3 py-2 rounded">
                  {article.metaTitle || '-'}
                </p>
                {article.metaTitle && (
                  <p className="text-xs text-muted-foreground">
                    {article.metaTitle.length}/60 characters
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <AlignLeft className="h-3 w-3" />
                  Meta Description
                </label>
                <p className="text-sm bg-muted/50 px-3 py-2 rounded">
                  {article.metaDescription || '-'}
                </p>
                {article.metaDescription && (
                  <p className="text-xs text-muted-foreground">
                    {article.metaDescription.length}/160 characters
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Stats */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Content Stats
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Word Count</p>
                <p className="text-xl font-semibold mt-1">
                  {article.wordCount?.toLocaleString() || '-'}
                </p>
              </div>
              
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Readability</p>
                <p className="text-xl font-semibold mt-1">
                  {article.readability || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium">Status</h4>
            <Badge variant="secondary" className="text-sm">
              {article.status}
            </Badge>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

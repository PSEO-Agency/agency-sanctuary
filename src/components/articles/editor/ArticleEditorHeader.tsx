import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarChart2, BookOpen, Globe, Calendar, User } from "lucide-react";
import type { Article } from "../ArticleRow";

interface ArticleEditorHeaderProps {
  article: Article;
}

const getScoreGrade = (score: number | null) => {
  if (!score) return { grade: '-', color: 'text-muted-foreground', bg: 'bg-muted' };
  if (score >= 90) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' };
  if (score >= 80) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' };
  if (score >= 70) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' };
  if (score >= 60) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
  return { grade: 'D', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' };
};

const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('published')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
  if (statusLower.includes('ready') || statusLower.includes('complete')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
  if (statusLower.includes('generate') || statusLower.includes('processing')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
  return 'bg-muted text-muted-foreground';
};

const getLanguageFlag = (language: string) => {
  const lang = language.toLowerCase();
  if (lang === 'dutch' || lang === 'nl') return '🇳🇱';
  if (lang === 'english' || lang === 'en') return '🇬🇧';
  return '🌐';
};

export function ArticleEditorHeader({ article }: ArticleEditorHeaderProps) {
  const scoreInfo = getScoreGrade(article.contentScore);
  
  const formattedDate = article.createdAt 
    ? new Date(article.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    : '-';

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Article Stats
      </h3>
      
      {/* Content Score */}
      <div className={`p-4 rounded-lg ${scoreInfo.bg}`}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Content Score</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${scoreInfo.color}`}>
            {scoreInfo.grade}
          </span>
          {article.contentScore && (
            <span className="text-sm text-muted-foreground">
              ({article.contentScore}%)
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Stats Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            Word Count
          </div>
          <span className="font-medium">
            {article.wordCount?.toLocaleString() || '-'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart2 className="h-4 w-4" />
            Readability
          </div>
          <span className="font-medium">
            {article.readability || '-'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            Language
          </div>
          <span className="font-medium flex items-center gap-1">
            {getLanguageFlag(article.language)}
            {article.language}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Created
          </div>
          <span className="font-medium text-sm">
            {formattedDate}
          </span>
        </div>
      </div>

      <Separator />

      {/* Status */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Status
        </span>
        <div>
          <Badge variant="secondary" className={getStatusColor(article.status)}>
            {article.status}
          </Badge>
        </div>
      </div>

      {/* Featured Image */}
      {article.imageUrl && (
        <>
          <Separator />
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Featured Image
            </span>
            <div className="rounded-lg overflow-hidden border">
              <img 
                src={article.imageUrl} 
                alt={article.name}
                className="w-full h-32 object-cover"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

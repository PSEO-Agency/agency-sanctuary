import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { ChevronRight, User } from "lucide-react";

export interface Article {
  id: string;
  name: string;
  status: string;
  createdBy: string[] | null;
  createdAt: string | null;
  language: string;
  contentScore: number | null;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  wordCount: number;
  readability: number | null;
  imageUrl: string | null;
  content: string;
  outline: string;
  html: string;
}

interface ArticleRowProps {
  article: Article;
  onSelect: (article: Article) => void;
}

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

export function ArticleRow({ article, onSelect }: ArticleRowProps) {
  const formattedDate = article.createdAt 
    ? new Date(article.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    : '-';

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSelect(article)}
    >
      <TableCell className="font-medium max-w-[300px] truncate">
        {article.name}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={getStatusColor(article.status)}>
          {article.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-muted-foreground">
          <User className="h-3 w-3" />
          <span className="text-sm">-</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formattedDate}
      </TableCell>
      <TableCell>
        <span className="text-lg" title={article.language}>
          {getLanguageFlag(article.language)}
        </span>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

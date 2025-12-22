import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  isSelected?: boolean;
  onToggleSelect?: () => void;
  viewMode?: "simple" | "full";
}

const getStatusVariant = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('published')) return { dot: 'bg-green-500', text: 'text-green-700 bg-green-50' };
  if (statusLower.includes('generated') || statusLower.includes('ready') || statusLower.includes('complete')) return { dot: 'bg-green-500', text: 'text-green-700 bg-green-50' };
  if (statusLower.includes('draft')) return { dot: 'bg-gray-400', text: 'text-gray-600 bg-gray-100' };
  if (statusLower.includes('processing') || statusLower.includes('generate')) return { dot: 'bg-yellow-500', text: 'text-yellow-700 bg-yellow-50' };
  return { dot: 'bg-gray-400', text: 'text-gray-600 bg-gray-100' };
};

export function ArticleRow({ article, onSelect, isSelected, onToggleSelect, viewMode = "simple" }: ArticleRowProps) {
  const formattedDate = article.createdAt 
    ? new Date(article.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    : '-';

  const statusStyle = getStatusVariant(article.status);
  const keyword = article.slug?.replace(/-/g, ' ') || '-';
  const creatorInitial = article.createdBy?.[0]?.charAt(0)?.toUpperCase() || 'A';

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50 transition-colors h-12"
      onClick={() => onSelect(article)}
    >
      <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={onToggleSelect}
        />
      </TableCell>
      <TableCell className="py-2 font-medium text-sm max-w-[280px] truncate">
        {article.name}
      </TableCell>
      <TableCell className="py-2 text-sm text-muted-foreground max-w-[180px] truncate">
        {keyword}
      </TableCell>
      <TableCell className="py-2">
        <Badge variant="secondary" className={`${statusStyle.text} font-normal text-xs gap-1.5 px-2 py-0.5`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
          {article.status}
        </Badge>
      </TableCell>
      <TableCell className="py-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {creatorInitial}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {article.createdBy?.[0] || 'Admin'}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-2 text-sm text-muted-foreground">
        {formattedDate}
      </TableCell>
    </TableRow>
  );
}
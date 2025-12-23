import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

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
  statusOptions?: string[];
}

// Define the status pipeline order and their estimated times
const STATUS_PIPELINE = [
  { status: 'Start Research', eta: '7-10 min' },
  { status: 'Researched', eta: '2-3 min' },
  { status: 'Generate Outline', eta: '3-5 min' },
  { status: 'Outlined', eta: '2-3 min' },
  { status: 'Generate Article', eta: '5-8 min' },
  { status: 'Generated', eta: null },
];

const isProcessingStatus = (status: string): boolean => {
  const processingStatuses = ['start research', 'researched', 'generate outline', 'outlined', 'generate article'];
  return processingStatuses.includes(status.toLowerCase());
};

const getStatusStep = (status: string): { step: number; total: number; eta: string | null } => {
  const normalizedStatus = status.toLowerCase();
  const index = STATUS_PIPELINE.findIndex(s => s.status.toLowerCase() === normalizedStatus);
  if (index === -1) {
    // If status is "Generated" or any completion status
    if (normalizedStatus.includes('generated') || normalizedStatus.includes('published') || normalizedStatus.includes('ready')) {
      return { step: STATUS_PIPELINE.length, total: STATUS_PIPELINE.length, eta: null };
    }
    return { step: 1, total: STATUS_PIPELINE.length, eta: STATUS_PIPELINE[0].eta };
  }
  return { step: index + 1, total: STATUS_PIPELINE.length, eta: STATUS_PIPELINE[index].eta };
};

const getStatusVariant = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('published')) return { dot: 'bg-green-500', text: 'text-green-700 bg-green-50', isProcessing: false };
  if (statusLower.includes('generated') || statusLower.includes('ready') || statusLower.includes('complete')) return { dot: 'bg-blue-500', text: 'text-blue-700 bg-blue-50', isProcessing: false };
  if (statusLower.includes('draft')) return { dot: 'bg-gray-400', text: 'text-gray-600 bg-gray-100', isProcessing: false };
  if (isProcessingStatus(status)) return { dot: 'bg-purple-500', text: 'text-purple-700 bg-purple-50', isProcessing: true };
  return { dot: 'bg-gray-400', text: 'text-gray-600 bg-gray-100', isProcessing: false };
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
  const { step, total, eta } = getStatusStep(article.status);

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
        <div className="flex flex-col gap-0.5">
          <Badge variant="secondary" className={`${statusStyle.text} font-normal text-xs gap-1.5 px-2.5 py-1 w-fit`}>
            {statusStyle.isProcessing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            )}
            <span>{article.status}</span>
            {statusStyle.isProcessing && (
              <span className="text-[10px] opacity-70">({step}/{total})</span>
            )}
          </Badge>
          {statusStyle.isProcessing && eta && (
            <span className="text-[10px] text-muted-foreground ml-1">~{eta}</span>
          )}
        </div>
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
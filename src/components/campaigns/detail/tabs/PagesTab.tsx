import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Eye, 
  Sparkles, 
  Search, 
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB } from "@/hooks/useCampaignPages";
import { PagePreviewDialog } from "../PagePreviewDialog";

interface PagesTabProps {
  campaign: CampaignDB;
  pages: CampaignPageDB[];
  pagesLoading: boolean;
  onDeletePage?: (id: string) => Promise<boolean>;
  onGenerateContent?: (pageId: string) => Promise<void>;
}

const ITEMS_PER_PAGE = 10;

export function PagesTab({ 
  campaign, 
  pages, 
  pagesLoading,
  onDeletePage,
  onGenerateContent,
}: PagesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [previewPage, setPreviewPage] = useState<CampaignPageDB | null>(null);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);

  // Filter pages
  const filteredPages = pages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Object.values(page.data_values || {}).some(v => 
        v.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesStatus = statusFilter === "all" || page.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPages.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPages = filteredPages.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPages(paginatedPages.map(p => p.id));
    } else {
      setSelectedPages([]);
    }
  };

  const handleSelectPage = (pageId: string, checked: boolean) => {
    if (checked) {
      setSelectedPages([...selectedPages, pageId]);
    } else {
      setSelectedPages(selectedPages.filter(id => id !== pageId));
    }
  };

  const handleBulkGenerate = async () => {
    if (!onGenerateContent || selectedPages.length === 0) return;
    
    setIsGeneratingBulk(true);
    try {
      for (const pageId of selectedPages) {
        await onGenerateContent(pageId);
      }
      setSelectedPages([]);
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700 border-gray-200",
      generated: "bg-blue-100 text-blue-700 border-blue-200",
      reviewed: "bg-purple-100 text-purple-700 border-purple-200",
      published: "bg-green-100 text-green-700 border-green-200",
    };
    return styles[status] || styles.draft;
  };

  const getDataPreview = (dataValues: Record<string, string>) => {
    const entries = Object.entries(dataValues || {});
    if (entries.length === 0) return "-";
    
    const preview = entries.slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(", ");
    return entries.length > 2 ? `${preview}, ...` : preview;
  };

  if (pagesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Campaign Pages</h2>
          <p className="text-sm text-muted-foreground">
            {pages.length} pages generated • {pages.filter(p => p.status === "published").length} published
          </p>
        </div>
        {selectedPages.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedPages.length} selected
            </span>
            <Button
              size="sm"
              onClick={handleBulkGenerate}
              disabled={isGeneratingBulk}
            >
              {isGeneratingBulk ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Selected
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pages Table */}
      {filteredPages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">No pages found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your filters"
                : "Pages will appear here once generated from the Matrix Builder"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedPages.length === paginatedPages.length && paginatedPages.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Data Values</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPages.includes(page.id)}
                      onCheckedChange={(checked) => handleSelectPage(page.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {getDataPreview(page.data_values)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getStatusBadge(page.status)}
                    >
                      {page.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPreviewPage(page)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {page.status === "draft" && onGenerateContent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onGenerateContent(page.id)}
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      )}
                      {onDeletePage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDeletePage(page.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredPages.length)} of {filteredPages.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Page Preview Dialog */}
      <PagePreviewDialog
        open={!!previewPage}
        onOpenChange={(open) => !open && setPreviewPage(null)}
        page={previewPage}
        campaign={campaign}
        onGenerateContent={onGenerateContent}
      />
    </div>
  );
}

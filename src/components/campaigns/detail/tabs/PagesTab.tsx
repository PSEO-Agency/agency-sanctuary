import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  RefreshCw,
} from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB } from "@/hooks/useCampaignPages";
import { PagePreviewDialog } from "../PagePreviewDialog";
import { toast } from "sonner";

interface PagesTabProps {
  campaign: CampaignDB;
  pages: CampaignPageDB[];
  pagesLoading: boolean;
  onDeletePage?: (id: string) => Promise<boolean>;
  onGenerateContent?: (pageId: string) => Promise<any>;
  onRefetchPages?: () => Promise<void>;
}

const ITEMS_PER_PAGE = 10;

export function PagesTab({ 
  campaign, 
  pages, 
  pagesLoading,
  onDeletePage,
  onGenerateContent,
  onRefetchPages,
}: PagesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [previewPageId, setPreviewPageId] = useState<string | null>(null);
  
  // Generation tracking
  const [generatingPageIds, setGeneratingPageIds] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Derive preview page from pages array to avoid stale data
  const previewPage = pages.find(p => p.id === previewPageId) || null;

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

  const handleGenerateSingle = async (pageId: string) => {
    if (!onGenerateContent) return;
    
    setGeneratingPageIds(prev => new Set(prev).add(pageId));
    
    try {
      await onGenerateContent(pageId);
      toast.success("Content generated successfully!");
    } catch (error) {
      // Error already handled in parent
    } finally {
      setGeneratingPageIds(prev => {
        const next = new Set(prev);
        next.delete(pageId);
        return next;
      });
    }
  };

  const handleBulkGenerate = async () => {
    if (!onGenerateContent || selectedPages.length === 0) return;
    
    const toGenerate = selectedPages.filter(id => {
      const page = pages.find(p => p.id === id);
      return page?.status === "draft";
    });

    if (toGenerate.length === 0) {
      toast.info("No draft pages selected for generation");
      return;
    }

    setBulkProgress({ current: 0, total: toGenerate.length });
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toGenerate.length; i++) {
      const pageId = toGenerate[i];
      setGeneratingPageIds(prev => new Set(prev).add(pageId));
      setBulkProgress({ current: i, total: toGenerate.length });
      
      try {
        await onGenerateContent(pageId);
        successCount++;
      } catch (error) {
        failCount++;
      } finally {
        setGeneratingPageIds(prev => {
          const next = new Set(prev);
          next.delete(pageId);
          return next;
        });
      }
    }

    setBulkProgress(null);
    setSelectedPages([]);
    
    if (successCount > 0) {
      toast.success(`Generated content for ${successCount} page${successCount > 1 ? "s" : ""}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to generate ${failCount} page${failCount > 1 ? "s" : ""}`);
    }
  };

  const handleGenerateAllDrafts = async () => {
    if (!onGenerateContent) return;
    
    const draftPages = pages.filter(p => p.status === "draft");
    if (draftPages.length === 0) {
      toast.info("No draft pages to generate");
      return;
    }

    setSelectedPages(draftPages.map(p => p.id));
    
    setBulkProgress({ current: 0, total: draftPages.length });
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < draftPages.length; i++) {
      const pageId = draftPages[i].id;
      setGeneratingPageIds(prev => new Set(prev).add(pageId));
      setBulkProgress({ current: i + 1, total: draftPages.length });
      
      try {
        await onGenerateContent(pageId);
        successCount++;
      } catch (error) {
        failCount++;
      } finally {
        setGeneratingPageIds(prev => {
          const next = new Set(prev);
          next.delete(pageId);
          return next;
        });
      }
    }

    setBulkProgress(null);
    setSelectedPages([]);
    
    if (successCount > 0) {
      toast.success(`Generated content for ${successCount} page${successCount > 1 ? "s" : ""}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to generate ${failCount} page${failCount > 1 ? "s" : ""}`);
    }
  };

  const getStatusBadge = (status: string, isGenerating: boolean) => {
    if (isGenerating) {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }
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

  const draftCount = pages.filter(p => p.status === "draft").length;
  const generatedCount = pages.filter(p => p.status === "generated").length;
  const publishedCount = pages.filter(p => p.status === "published").length;

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
            {pages.length} pages • {draftCount} draft • {generatedCount} generated • {publishedCount} published
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefetchPages && (
            <Button variant="outline" size="sm" onClick={onRefetchPages}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
          {draftCount > 0 && onGenerateContent && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateAllDrafts}
              disabled={bulkProgress !== null}
            >
              {bulkProgress !== null ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate All Drafts ({draftCount})
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Progress */}
      {bulkProgress !== null && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Generating content...</span>
                <span className="text-muted-foreground">
                  {bulkProgress.current}/{bulkProgress.total} pages
                </span>
              </div>
              <Progress value={(bulkProgress.current / bulkProgress.total) * 100} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Actions */}
      {selectedPages.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedPages.length} page{selectedPages.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleBulkGenerate}
                  disabled={bulkProgress !== null}
                >
                  {bulkProgress !== null ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPages([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              <TableRow className="bg-muted/30">
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
              {paginatedPages.map((page) => {
                const isGenerating = generatingPageIds.has(page.id);
                return (
                  <TableRow key={page.id} className={isGenerating ? "bg-amber-50/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPages.includes(page.id)}
                        onCheckedChange={(checked) => handleSelectPage(page.id, !!checked)}
                        disabled={isGenerating}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {getDataPreview(page.data_values)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getStatusBadge(page.status, isGenerating)}
                      >
                        {isGenerating ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Generating...
                          </span>
                        ) : page.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewPageId(page.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {page.status === "draft" && onGenerateContent && !isGenerating && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleGenerateSingle(page.id)}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        )}
                        {isGenerating && (
                          <div className="h-8 w-8 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                          </div>
                        )}
                        {onDeletePage && !isGenerating && (
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
                );
              })}
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
        open={!!previewPageId}
        onOpenChange={(open) => !open && setPreviewPageId(null)}
        page={previewPage}
        campaign={campaign}
        onGenerateContent={handleGenerateSingle}
        isGenerating={previewPageId ? generatingPageIds.has(previewPageId) : false}
      />
    </div>
  );
}

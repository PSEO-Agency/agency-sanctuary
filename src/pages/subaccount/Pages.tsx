import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  Search, 
  Filter, 
  FileStack, 
  Eye, 
  MoreHorizontal, 
  Trash2,
  FolderKanban,
  ChevronRight,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAllCampaignPages, CampaignPage } from "@/hooks/useAllCampaignPages";
import { CampaignPageDB, SectionContent, KeywordData } from "@/hooks/useCampaignPages";
import { PagePreviewDialog } from "@/components/campaigns/detail/PagePreviewDialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Helper to convert CampaignPage to CampaignPageDB format
const convertToCampaignPageDB = (page: CampaignPage): CampaignPageDB => ({
  id: page.id,
  campaign_id: page.campaign_id,
  subaccount_id: page.subaccount_id,
  title: page.title,
  slug: page.slug,
  data_values: page.data_values,
  meta_title: page.meta_title,
  meta_description: page.meta_description,
  sections_content: (Array.isArray(page.sections_content) ? page.sections_content : []) as unknown as SectionContent[],
  keywords: (Array.isArray(page.keywords) ? page.keywords : []) as unknown as KeywordData[],
  status: page.status as "draft" | "generated" | "reviewed" | "published",
  published_url: page.published_url,
  published_at: page.published_at,
  preview_token: page.preview_token,
  created_at: page.created_at,
  updated_at: page.updated_at,
});

export default function Pages() {
  const { subaccountId } = useParams();
  const { 
    pages, 
    campaigns, 
    loading, 
    error, 
    refetch,
    getPagesByCampaign, 
    getPagesByStatus,
    searchPages 
  } = useAllCampaignPages(subaccountId || "");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<CampaignPage | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<any>(null);

  // Filter pages based on search and filters
  const filteredPages = useMemo(() => {
    let result = pages;

    if (searchQuery) {
      result = searchPages(searchQuery);
    }

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (campaignFilter !== "all") {
      result = result.filter((p) => p.campaign_id === campaignFilter);
    }

    return result;
  }, [pages, searchQuery, statusFilter, campaignFilter, searchPages]);

  // Pages for the selected campaign in "By Campaign" view
  const selectedCampaignPages = useMemo(() => {
    if (!selectedCampaignId) return [];
    return getPagesByCampaign(selectedCampaignId);
  }, [selectedCampaignId, getPagesByCampaign]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "generated":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Generated</Badge>;
      case "published":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Published</Badge>;
      case "draft":
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const handlePreviewPage = async (page: CampaignPage) => {
    // Fetch the campaign data for the preview dialog
    try {
      const { data: campaignData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", page.campaign_id)
        .single();
      
      setPreviewCampaign(campaignData);
      setPreviewPage(page);
    } catch (err) {
      console.error("Error fetching campaign:", err);
      setPreviewPage(page);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pages</h1>
          <p className="text-muted-foreground">
            View and manage all generated pages across campaigns
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {pages.length} total pages
        </Badge>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <FileStack className="h-4 w-4" />
            All Pages
          </TabsTrigger>
          <TabsTrigger value="by-campaign" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            By Campaign
          </TabsTrigger>
        </TabsList>

        {/* All Pages Tab */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-[180px]">
                <FolderKanban className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pages Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Title</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <FileStack className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No pages found</p>
                        <p className="text-sm">Create a campaign to generate pages</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell>
                          <div className="font-medium">{page.title}</div>
                          {page.slug && (
                            <div className="text-sm text-muted-foreground">/{page.slug}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {page.campaign_name}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(page.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(page.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreviewPage(page)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {page.preview_token && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/preview/${page.preview_token}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handlePreviewPage(page)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Edit Page
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Regenerate Content
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Page
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Campaign Tab */}
        <TabsContent value="by-campaign" className="space-y-4">
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-280px)]">
            {/* Campaign Sidebar */}
            <Card className="col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <div className="space-y-1 p-2">
                    {campaigns.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4 text-center">
                        No campaigns yet
                      </p>
                    ) : (
                      campaigns.map((campaign) => {
                        const campaignPages = getPagesByCampaign(campaign.id);
                        const isSelected = selectedCampaignId === campaign.id;
                        
                        return (
                          <button
                            key={campaign.id}
                            onClick={() => setSelectedCampaignId(campaign.id)}
                            className={cn(
                              "w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors",
                              isSelected
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FolderKanban className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-sm font-medium">
                                {campaign.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {campaignPages.length}
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Pages Panel */}
            <Card className="col-span-9">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {selectedCampaignId
                      ? campaigns.find((c) => c.id === selectedCampaignId)?.name || "Pages"
                      : "Select a Campaign"}
                  </CardTitle>
                  {selectedCampaignId && (
                    <Badge variant="outline">
                      {selectedCampaignPages.length} pages
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {!selectedCampaignId ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <FolderKanban className="h-12 w-12 mb-4 opacity-50" />
                    <p>Select a campaign to view its pages</p>
                  </div>
                ) : selectedCampaignPages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <FileStack className="h-12 w-12 mb-4 opacity-50" />
                    <p>No pages in this campaign</p>
                    <p className="text-sm">Generate pages from the Matrix Builder</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-380px)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50%]">Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCampaignPages.map((page) => (
                          <TableRow key={page.id}>
                            <TableCell>
                              <div className="font-medium">{page.title}</div>
                              {page.slug && (
                                <div className="text-sm text-muted-foreground">
                                  /{page.slug}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(page.status)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(page.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePreviewPage(page)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {page.preview_token && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      window.open(`/preview/${page.preview_token}`, "_blank")
                                    }
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Page Preview Dialog */}
      {previewPage && previewCampaign && (
        <PagePreviewDialog
          open={!!previewPage}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewPage(null);
              setPreviewCampaign(null);
              refetch();
            }
          }}
          page={convertToCampaignPageDB(previewPage)}
          campaign={previewCampaign}
        />
      )}
    </div>
  );
}

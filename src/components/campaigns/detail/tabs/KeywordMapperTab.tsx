import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Upload, 
  Plus, 
  Loader2, 
  Search, 
  Plug, 
  Lightbulb, 
  Globe, 
  RefreshCw, 
  Trash2, 
  Wand2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB, KeywordData } from "@/hooks/useCampaignPages";
import { useDataForSEO, KeywordSuggestion, CompetitorKeyword } from "@/hooks/useDataForSEO";
import { DataForSEOConnectDialog } from "@/components/campaigns/keywords/DataForSEOConnectDialog";
import { KeywordSuggestionsPanel } from "@/components/campaigns/keywords/KeywordSuggestionsPanel";
import { CompetitorAnalysisPanel } from "@/components/campaigns/keywords/CompetitorAnalysisPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KeywordMapperTabProps {
  campaign: CampaignDB;
  pages: CampaignPageDB[];
  pagesLoading: boolean;
  onUpdateKeywords: (pageId: string, keywords: KeywordData[]) => Promise<void>;
}

export function KeywordMapperTab({ campaign, pages, pagesLoading, onUpdateKeywords }: KeywordMapperTabProps) {
  const [integrationSource, setIntegrationSource] = useState("manual");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingKeyword, setEditingKeyword] = useState<{ pageId: string; value: string } | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  
  // DataForSEO integration state
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [competitorOpen, setCompetitorOpen] = useState(false);
  const [seedKeyword, setSeedKeyword] = useState("");
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [competitorKeywords, setCompetitorKeywords] = useState<CompetitorKeyword[]>([]);
  const [enriching, setEnriching] = useState(false);

  const { 
    connections, 
    loading: connectionsLoading, 
    operationLoading,
    createConnection,
    deleteConnection,
    getKeywordSuggestions,
    getSearchVolume,
    getKeywordDifficulty,
    getCompetitorKeywords,
  } = useDataForSEO(campaign.subaccount_id);

  // Get the connected SEO connection for this campaign
  const [campaignConnection, setCampaignConnection] = useState<string | null>(
    campaign.seo_connection_id || null
  );

  const activeConnection = connections.find(c => c.id === campaignConnection);

  // Filter pages by search
  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.keywords?.some(k => k.keyword.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getKDColor = (kd: number) => {
    if (kd < 20) return "bg-green-100 text-green-700";
    if (kd < 50) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  const handleToggleKeyword = async (pageId: string, keywordIndex: number) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    const keywords = [...(page.keywords || [])];
    if (keywords[keywordIndex]) {
      keywords[keywordIndex] = {
        ...keywords[keywordIndex],
        selected: !keywords[keywordIndex].selected,
      };
      await onUpdateKeywords(pageId, keywords);
    }
  };

  const handleAddKeyword = async (pageId: string, keyword: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page || !keyword.trim()) return;

    const keywords = [...(page.keywords || [])];
    keywords.push({
      keyword: keyword.trim(),
      selected: true,
      volume: 0,
      kd: 0,
      clicks: 0,
    });
    
    await onUpdateKeywords(pageId, keywords);
    setEditingKeyword(null);
    toast.success("Keyword added");
  };

  const handleConnect = async (name: string, login: string, password: string): Promise<boolean> => {
    const connection = await createConnection(name, login, password);
    if (connection) {
      // Update campaign with connection ID
      await supabase
        .from("campaigns")
        .update({ seo_connection_id: connection.id })
        .eq("id", campaign.id);
      
      setCampaignConnection(connection.id);
      setIntegrationSource("dataforseo");
      return true;
    }
    return false;
  };

  const handleDisconnect = async () => {
    if (!campaignConnection) return;
    
    // Just remove from campaign, don't delete the connection
    await supabase
      .from("campaigns")
      .update({ seo_connection_id: null })
      .eq("id", campaign.id);
    
    setCampaignConnection(null);
    setIntegrationSource("manual");
    toast.success("Disconnected from DataForSEO");
  };

  const handleFetchSuggestions = async () => {
    if (!activeConnection || !seedKeyword.trim()) return;
    
    const results = await getKeywordSuggestions(activeConnection.id, [seedKeyword.trim()]);
    if (results) {
      setSuggestions(results);
    }
  };

  const handleAnalyzeCompetitor = async () => {
    if (!activeConnection || !competitorDomain.trim()) return;
    
    const results = await getCompetitorKeywords(activeConnection.id, competitorDomain.trim());
    if (results) {
      setCompetitorKeywords(results);
    }
  };

  const handleAddSuggestedKeywords = async (keywords: { keyword: string; volume: number; cpc: number }[]) => {
    if (!selectedPageId) {
      toast.error("Please select a page first");
      return;
    }

    const page = pages.find(p => p.id === selectedPageId);
    if (!page) return;

    const existingKeywords = page.keywords || [];
    const newKeywords: KeywordData[] = keywords.map(k => ({
      keyword: k.keyword,
      volume: k.volume,
      kd: 0,
      clicks: 0,
      selected: true,
    }));

    await onUpdateKeywords(selectedPageId, [...existingKeywords, ...newKeywords]);
    setSuggestionsOpen(false);
    toast.success(`Added ${keywords.length} keywords`);
  };

  const handleAddCompetitorKeywords = async (keywords: { keyword: string; volume: number; kd: number }[]) => {
    if (!selectedPageId) {
      toast.error("Please select a page first");
      return;
    }

    const page = pages.find(p => p.id === selectedPageId);
    if (!page) return;

    const existingKeywords = page.keywords || [];
    const newKeywords: KeywordData[] = keywords.map(k => ({
      keyword: k.keyword,
      volume: k.volume,
      kd: k.kd,
      clicks: 0,
      selected: true,
    }));

    await onUpdateKeywords(selectedPageId, [...existingKeywords, ...newKeywords]);
    setCompetitorOpen(false);
    toast.success(`Imported ${keywords.length} keywords`);
  };

  const handleGenerateFromTitles = async () => {
    if (!activeConnection) {
      toast.error("Connect DataForSEO first");
      return;
    }

    // Extract seed keywords from page titles
    const seedKeywords = pages
      .slice(0, 10) // Limit to first 10 pages
      .map(p => {
        // Extract the main subject from title
        const title = p.title.toLowerCase();
        return title.split(/[-|:]/).map(s => s.trim())[0];
      })
      .filter(Boolean);

    if (seedKeywords.length === 0) {
      toast.error("No page titles to generate from");
      return;
    }

    setSeedKeyword(seedKeywords[0]);
    setSuggestionsOpen(true);
    
    const results = await getKeywordSuggestions(activeConnection.id, seedKeywords.slice(0, 3));
    if (results) {
      setSuggestions(results);
    }
  };

  const handleEnrichKeywords = async () => {
    if (!activeConnection) {
      toast.error("Connect DataForSEO first");
      return;
    }

    // Collect all keywords that need enrichment
    const allKeywords: { pageId: string; keyword: string; index: number }[] = [];
    pages.forEach(page => {
      (page.keywords || []).forEach((kw, idx) => {
        if (kw.volume === 0 || kw.kd === 0) {
          allKeywords.push({ pageId: page.id, keyword: kw.keyword, index: idx });
        }
      });
    });

    if (allKeywords.length === 0) {
      toast.info("All keywords already have metrics");
      return;
    }

    setEnriching(true);
    
    try {
      // Get unique keywords
      const uniqueKeywords = [...new Set(allKeywords.map(k => k.keyword))];
      
      // Fetch volume and difficulty
      const [volumeResults, difficultyResults] = await Promise.all([
        getSearchVolume(activeConnection.id, uniqueKeywords),
        getKeywordDifficulty(activeConnection.id, uniqueKeywords),
      ]);

      if (!volumeResults || !difficultyResults) {
        throw new Error("Failed to fetch metrics");
      }

      // Build lookup maps
      const volumeMap = new Map(volumeResults.map(v => [v.keyword, v]));
      const difficultyMap = new Map(difficultyResults.map(d => [d.keyword, d.difficulty]));

      // Update each page's keywords
      const updatedPages = new Map<string, KeywordData[]>();
      
      for (const { pageId, keyword, index } of allKeywords) {
        if (!updatedPages.has(pageId)) {
          const page = pages.find(p => p.id === pageId);
          updatedPages.set(pageId, [...(page?.keywords || [])]);
        }
        
        const pageKeywords = updatedPages.get(pageId)!;
        const volumeData = volumeMap.get(keyword);
        const kd = difficultyMap.get(keyword) || 0;
        
        pageKeywords[index] = {
          ...pageKeywords[index],
          volume: volumeData?.volume || 0,
          kd,
        };
      }

      // Save all updates
      for (const [pageId, keywords] of updatedPages) {
        await onUpdateKeywords(pageId, keywords);
      }

      toast.success(`Enriched ${allKeywords.length} keywords with metrics`);
    } catch (error) {
      console.error("Enrichment error:", error);
      toast.error("Failed to enrich keywords");
    } finally {
      setEnriching(false);
    }
  };

  // Calculate totals
  const totalKeywords = pages.reduce((sum, p) => sum + (p.keywords?.length || 0), 0);
  const selectedKeywords = pages.reduce((sum, p) => sum + (p.keywords?.filter(k => k.selected).length || 0), 0);

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
          <h2 className="text-xl font-bold">Keyword Mapper</h2>
          <p className="text-sm text-muted-foreground">Map keywords to your campaign pages</p>
        </div>
        
        {/* Connection Status */}
        {activeConnection ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {activeConnection.name}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button onClick={() => setConnectDialogOpen(true)}>
            <Plug className="h-4 w-4 mr-2" />
            Connect DataForSEO
          </Button>
        )}
      </div>

      {/* Integration Tools */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label className="text-sm">Integration Source</Label>
          <Select value={activeConnection ? "dataforseo" : "manual"} disabled>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual Entry</SelectItem>
              <SelectItem value="dataforseo">DataForSEO</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm">Search Pages & Keywords</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div>
          <Label className="text-sm">Quick Actions</Label>
          <div className="flex gap-2 mt-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleGenerateFromTitles}
              disabled={!activeConnection || operationLoading}
            >
              <Wand2 className="h-4 w-4 mr-1" />
              Auto-Generate
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleEnrichKeywords}
              disabled={!activeConnection || enriching || totalKeywords === 0}
            >
              {enriching ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Enrich All
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-sm">Research Tools</Label>
          <div className="flex gap-2 mt-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => {
                setSuggestions([]);
                setSuggestionsOpen(true);
              }}
              disabled={!activeConnection}
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              Suggestions
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => {
                setCompetitorKeywords([]);
                setCompetitorOpen(true);
              }}
              disabled={!activeConnection}
            >
              <Globe className="h-4 w-4 mr-1" />
              Competitors
            </Button>
          </div>
        </div>
      </div>

      {/* Keywords Table */}
      <Card>
        <CardContent className="p-0">
          {filteredPages.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No pages found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Page Title</th>
                    <th className="text-left p-3 font-medium">Keywords</th>
                    <th className="text-left p-3 font-medium">Volume</th>
                    <th className="text-left p-3 font-medium">KD</th>
                    <th className="text-center p-3 font-medium">Selected</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPages.map((page) => {
                    const pageKeywords = page.keywords || [];
                    
                    if (pageKeywords.length === 0) {
                      return (
                        <tr key={page.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{page.title}</td>
                          <td className="p-3 text-muted-foreground" colSpan={4}>
                            {editingKeyword?.pageId === page.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Enter keyword..."
                                  value={editingKeyword.value}
                                  onChange={(e) => setEditingKeyword({ ...editingKeyword, value: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleAddKeyword(page.id, editingKeyword.value);
                                    } else if (e.key === "Escape") {
                                      setEditingKeyword(null);
                                    }
                                  }}
                                  className="h-8 w-64"
                                  autoFocus
                                />
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleAddKeyword(page.id, editingKeyword.value)}
                                >
                                  Add
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => setEditingKeyword(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <span className="italic">No keywords assigned</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {activeConnection && (
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedPageId(page.id);
                                    setSeedKeyword(page.title.split(/[-|:]/)[0].trim());
                                    setSuggestionsOpen(true);
                                  }}
                                >
                                  <Lightbulb className="h-3 w-3" />
                                </Button>
                              )}
                              {!editingKeyword && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setEditingKeyword({ pageId: page.id, value: "" })}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return pageKeywords.map((keyword, kwIndex) => (
                      <tr 
                        key={`${page.id}-${kwIndex}`} 
                        className="border-b hover:bg-muted/30"
                      >
                        {kwIndex === 0 && (
                          <td className="p-3 font-medium" rowSpan={pageKeywords.length}>
                            {page.title}
                          </td>
                        )}
                        <td className="p-3">
                          <div>
                            <p>{keyword.keyword}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          {keyword.volume > 0 ? (
                            <span>{keyword.volume.toLocaleString()}/mo</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {keyword.kd > 0 ? (
                            <Badge className={getKDColor(keyword.kd)} variant="secondary">
                              {keyword.kd}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={keyword.selected}
                            onCheckedChange={() => handleToggleKeyword(page.id, kwIndex)}
                          />
                        </td>
                        {kwIndex === 0 && (
                          <td className="p-3 text-right" rowSpan={pageKeywords.length}>
                            <div className="flex items-center justify-end gap-1">
                              {activeConnection && (
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedPageId(page.id);
                                    setSeedKeyword(page.title.split(/[-|:]/)[0].trim());
                                    setSuggestionsOpen(true);
                                  }}
                                >
                                  <Lightbulb className="h-3 w-3" />
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setEditingKeyword({ pageId: page.id, value: "" })}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-6">
          <p className="text-sm">
            Total keywords: <span className="text-primary font-medium">{totalKeywords}</span>
          </p>
          <p className="text-sm">
            Selected: <span className="text-primary font-medium">{selectedKeywords}</span>
          </p>
          <p className="text-sm">
            Pages with keywords: <span className="text-primary font-medium">
              {pages.filter(p => p.keywords && p.keywords.length > 0).length}/{pages.length}
            </span>
          </p>
        </div>
        <Button variant="outline" disabled>
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import CSV
        </Button>
      </div>

      {/* Dialogs */}
      <DataForSEOConnectDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        onConnect={handleConnect}
        loading={connectionsLoading}
      />

      <KeywordSuggestionsPanel
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
        seedKeyword={seedKeyword}
        onSeedKeywordChange={setSeedKeyword}
        suggestions={suggestions}
        loading={operationLoading}
        onFetchSuggestions={handleFetchSuggestions}
        onAddKeywords={handleAddSuggestedKeywords}
      />

      <CompetitorAnalysisPanel
        open={competitorOpen}
        onOpenChange={setCompetitorOpen}
        domain={competitorDomain}
        onDomainChange={setCompetitorDomain}
        keywords={competitorKeywords}
        loading={operationLoading}
        onAnalyze={handleAnalyzeCompetitor}
        onAddKeywords={handleAddCompetitorKeywords}
      />
    </div>
  );
}

import { useState } from "react";
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
import { Upload, Plus, Loader2, Search } from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB, KeywordData } from "@/hooks/useCampaignPages";
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
      <div>
        <h2 className="text-xl font-bold">Keyword Mapper</h2>
        <p className="text-sm text-muted-foreground">Map keywords to your campaign pages</p>
      </div>

      {/* Integration Source & Search */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-sm">Integration Source</Label>
          <Select value={integrationSource} onValueChange={setIntegrationSource}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual Entry</SelectItem>
              <SelectItem value="semrush">Semrush (Coming Soon)</SelectItem>
              <SelectItem value="ahrefs">Ahrefs (Coming Soon)</SelectItem>
              <SelectItem value="moz">Moz (Coming Soon)</SelectItem>
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
          <Label className="text-sm">Upload Keywords (CSV)</Label>
          <div className="mt-1 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <span className="text-sm text-muted-foreground">Drop file or click</span>
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
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingKeyword({ pageId: page.id, value: "" })}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
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
        <Button variant="outline" onClick={() => setEditingKeyword({ pageId: "", value: "" })}>
          <Plus className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </div>
    </div>
  );
}

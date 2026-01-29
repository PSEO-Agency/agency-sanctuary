import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Loader2, Search, Plus, Globe, TrendingUp } from "lucide-react";
import { CompetitorKeyword } from "@/hooks/useDataForSEO";

interface CompetitorAnalysisPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  onDomainChange: (value: string) => void;
  keywords: CompetitorKeyword[];
  loading: boolean;
  onAnalyze: () => void;
  onAddKeywords: (keywords: { keyword: string; volume: number; kd: number }[]) => void;
}

export function CompetitorAnalysisPanel({
  open,
  onOpenChange,
  domain,
  onDomainChange,
  keywords,
  loading,
  onAnalyze,
  onAddKeywords,
}: CompetitorAnalysisPanelProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev => {
      const next = new Set(prev);
      if (next.has(keyword)) {
        next.delete(keyword);
      } else {
        next.add(keyword);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedKeywords(new Set(keywords.map(k => k.keyword)));
  };

  const deselectAll = () => {
    setSelectedKeywords(new Set());
  };

  const handleAddSelected = () => {
    const keywordsToAdd = keywords
      .filter(k => selectedKeywords.has(k.keyword))
      .map(k => ({ keyword: k.keyword, volume: k.volume, kd: k.difficulty }));
    
    if (keywordsToAdd.length > 0) {
      onAddKeywords(keywordsToAdd);
      setSelectedKeywords(new Set());
    }
  };

  const getPositionColor = (pos: number) => {
    if (pos <= 3) return "bg-green-100 text-green-700";
    if (pos <= 10) return "bg-amber-100 text-amber-700";
    return "bg-muted text-muted-foreground";
  };

  const getKDColor = (kd: number) => {
    if (kd < 30) return "bg-green-100 text-green-700";
    if (kd < 60) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            Competitor Analysis
          </SheetTitle>
          <SheetDescription>
            Enter a competitor's domain to discover keywords they rank for.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Domain Input */}
          <div className="flex gap-2">
            <Input
              placeholder="competitor.com"
              value={domain}
              onChange={(e) => onDomainChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && domain.trim()) {
                  onAnalyze();
                }
              }}
            />
            <Button 
              onClick={onAnalyze} 
              disabled={loading || !domain.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Results */}
          {keywords.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Found {keywords.length} keywords
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Clear
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px] rounded-md border">
                <div className="p-2 space-y-1">
                  {keywords.map((kw) => (
                    <div
                      key={kw.keyword}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleKeyword(kw.keyword)}
                    >
                      <Checkbox
                        checked={selectedKeywords.has(kw.keyword)}
                        onCheckedChange={() => toggleKeyword(kw.keyword)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{kw.keyword}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {kw.volume.toLocaleString()}/mo
                          </span>
                          <span>${kw.cpc.toFixed(2)} CPC</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Badge className={getPositionColor(kw.position)} variant="secondary">
                          #{kw.position}
                        </Badge>
                        <Badge className={getKDColor(kw.difficulty)} variant="secondary">
                          {kw.difficulty}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {!loading && keywords.length === 0 && domain && (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Enter a competitor domain and click search</p>
            </div>
          )}
        </div>

        <SheetFooter className="mt-6">
          <Button
            onClick={handleAddSelected}
            disabled={selectedKeywords.size === 0}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Import {selectedKeywords.size} Keywords
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

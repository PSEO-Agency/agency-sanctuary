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
import { Loader2, RefreshCw, Plus, Lightbulb, TrendingUp } from "lucide-react";
import { KeywordSuggestion } from "@/hooks/useDataForSEO";

interface KeywordSuggestionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seedKeyword: string;
  onSeedKeywordChange: (value: string) => void;
  suggestions: KeywordSuggestion[];
  loading: boolean;
  onFetchSuggestions: () => void;
  onAddKeywords: (keywords: { keyword: string; volume: number; cpc: number }[]) => void;
}

export function KeywordSuggestionsPanel({
  open,
  onOpenChange,
  seedKeyword,
  onSeedKeywordChange,
  suggestions,
  loading,
  onFetchSuggestions,
  onAddKeywords,
}: KeywordSuggestionsPanelProps) {
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
    setSelectedKeywords(new Set(suggestions.map(s => s.keyword)));
  };

  const deselectAll = () => {
    setSelectedKeywords(new Set());
  };

  const handleAddSelected = () => {
    const keywordsToAdd = suggestions
      .filter(s => selectedKeywords.has(s.keyword))
      .map(s => ({ keyword: s.keyword, volume: s.volume, cpc: s.cpc }));
    
    if (keywordsToAdd.length > 0) {
      onAddKeywords(keywordsToAdd);
      setSelectedKeywords(new Set());
    }
  };

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case "LOW": return "bg-green-100 text-green-700";
      case "MEDIUM": return "bg-amber-100 text-amber-700";
      case "HIGH": return "bg-red-100 text-red-700";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Keyword Suggestions
          </SheetTitle>
          <SheetDescription>
            Enter a seed keyword to get related keyword suggestions from DataForSEO.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Seed Keyword Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter seed keyword..."
              value={seedKeyword}
              onChange={(e) => onSeedKeywordChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && seedKeyword.trim()) {
                  onFetchSuggestions();
                }
              }}
            />
            <Button 
              onClick={onFetchSuggestions} 
              disabled={loading || !seedKeyword.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Results */}
          {suggestions.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Found {suggestions.length} suggestions
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
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.keyword}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleKeyword(suggestion.keyword)}
                    >
                      <Checkbox
                        checked={selectedKeywords.has(suggestion.keyword)}
                        onCheckedChange={() => toggleKeyword(suggestion.keyword)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{suggestion.keyword}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {suggestion.volume.toLocaleString()}/mo
                          </span>
                          <span>${suggestion.cpc.toFixed(2)} CPC</span>
                        </div>
                      </div>
                      <Badge className={getCompetitionColor(suggestion.competition)} variant="secondary">
                        {suggestion.competition || "N/A"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {!loading && suggestions.length === 0 && seedKeyword && (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Enter a seed keyword and click search to get suggestions</p>
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
            Add {selectedKeywords.size} Keywords
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Upload, Plus, ChevronDown } from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB, KeywordData } from "@/hooks/useCampaignPages";
import { PageSelector } from "../../PageSelector";

interface Keyword {
  id: string;
  pageTitle: string;
  keyword: string;
  language: string;
  volume: number;
  kd: number;
  clicks: number;
  parentTopic: string;
  selected: boolean;
}

interface KeywordMapperTabProps {
  campaign: CampaignDB;
  pages: CampaignPageDB[];
  pagesLoading: boolean;
  onUpdateKeywords: (pageId: string, keywords: KeywordData[]) => Promise<void>;
}

export function KeywordMapperTab({ campaign }: KeywordMapperTabProps) {
  const [integrationSource, setIntegrationSource] = useState("semrush");
  const [keywords, setKeywords] = useState<Keyword[]>([
    {
      id: "1",
      pageTitle: "Dental Implants in Rotterdam",
      keyword: "Dental Implants Rotterdam English",
      language: "English",
      volume: 430,
      kd: 44,
      clicks: 180,
      parentTopic: "Dental Procedures",
      selected: false,
    },
    {
      id: "2",
      pageTitle: "Orthodontics in Amsterdam",
      keyword: "Orthodontics Amsterdam English",
      language: "English",
      volume: 320,
      kd: 8,
      clicks: 145,
      parentTopic: "Orthodontics",
      selected: true,
    },
    {
      id: "3",
      pageTitle: "Root Canal Treatment in Utrecht",
      keyword: "Root Canal Treatment Utrecht Dutch",
      language: "Dutch",
      volume: 280,
      kd: 67,
      clicks: 95,
      parentTopic: "Root Canal",
      selected: false,
    },
    {
      id: "4",
      pageTitle: "Dental Cleaning in Rotterdam",
      keyword: "Dental Cleaning in Rotterdam Dutch",
      language: "Dutch",
      volume: 450,
      kd: 22,
      clicks: 195,
      parentTopic: "Dental Cleaning",
      selected: true,
    },
  ]);
  const [showAll, setShowAll] = useState(false);

  const totalKeywords = 52;
  const selectedCount = keywords.filter(k => k.selected).length + 14;

  const getKDColor = (kd: number) => {
    if (kd < 20) return "bg-green-100 text-green-700";
    if (kd < 50) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  const toggleKeyword = (id: string) => {
    setKeywords(prev => prev.map(k => 
      k.id === id ? { ...k, selected: !k.selected } : k
    ));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Keyword Mapper</h2>
        <p className="text-sm text-muted-foreground">Set and edit your keywords</p>
      </div>

      {/* Integration Source & Upload */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm">Integration Source</Label>
          <Select value={integrationSource} onValueChange={setIntegrationSource}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semrush">Semrush</SelectItem>
              <SelectItem value="ahrefs">Ahrefs</SelectItem>
              <SelectItem value="moz">Moz</SelectItem>
              <SelectItem value="manual">Manual Entry</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm">Upload Keywords</Label>
          <div className="mt-1 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <span className="text-sm text-muted-foreground">No file chosen</span>
          </div>
        </div>
      </div>

      {/* Keywords Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Page Title</th>
                  <th className="text-left p-3 font-medium">Keyword</th>
                  <th className="text-left p-3 font-medium">KD</th>
                  <th className="text-left p-3 font-medium">Clicks</th>
                  <th className="text-left p-3 font-medium">Parent Topic</th>
                  <th className="text-center p-3 font-medium">Use?</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((keyword) => (
                  <tr key={keyword.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{keyword.pageTitle}</td>
                    <td className="p-3">
                      <div>
                        <p>{keyword.keyword}</p>
                        <p className="text-xs text-muted-foreground">
                          {keyword.volume} searches/month
                        </p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={getKDColor(keyword.kd)} variant="secondary">
                        {keyword.kd}%
                      </Badge>
                    </td>
                    <td className="p-3">{keyword.clicks}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {keyword.parentTopic}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Checkbox 
                        checked={keyword.selected}
                        onCheckedChange={() => toggleKeyword(keyword.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!showAll && (
            <button 
              onClick={() => setShowAll(true)}
              className="w-full p-3 text-sm text-primary hover:bg-muted/30 flex items-center justify-center gap-1"
            >
              Show More <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-6">
          <p className="text-sm">
            Total generated keywords: <span className="text-primary font-medium">{totalKeywords}</span>
          </p>
          <p className="text-sm">
            Total Selected: <span className="text-primary font-medium">{selectedCount}</span>
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Keyword
        </Button>
      </div>
    </div>
  );
}

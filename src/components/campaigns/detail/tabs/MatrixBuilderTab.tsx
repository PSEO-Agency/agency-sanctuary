import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, FileSpreadsheet, List, Plus, X, AlertTriangle } from "lucide-react";
import { Campaign, BUSINESS_TYPES } from "../../types";

interface MatrixBuilderTabProps {
  campaign: Campaign;
}

export function MatrixBuilderTab({ campaign }: MatrixBuilderTabProps) {
  const [columns, setColumns] = useState<Record<string, string[]>>({
    services: ["Teeth Whitening", "Dental Implants"],
    cities: ["Amsterdam", "Rotterdam", "Utrecht"],
    languages: ["English", "Dutch"],
  });

  const [newItems, setNewItems] = useState<Record<string, string>>({});

  const businessType = BUSINESS_TYPES.find(bt => bt.id === campaign.businessType);
  const columnConfigs = businessType?.columns || BUSINESS_TYPES[2].columns;

  const totalCombinations = Object.values(columns).reduce(
    (acc, col) => acc * (col.length || 1),
    1
  );

  const handleAddItem = (columnId: string) => {
    const value = newItems[columnId]?.trim();
    if (!value) return;
    
    setColumns(prev => ({
      ...prev,
      [columnId]: [...(prev[columnId] || []), value],
    }));
    setNewItems(prev => ({ ...prev, [columnId]: "" }));
  };

  const handleRemoveItem = (columnId: string, index: number) => {
    setColumns(prev => ({
      ...prev,
      [columnId]: prev[columnId].filter((_, i) => i !== index),
    }));
  };

  // Generate sample combinations
  const generateCombinations = () => {
    const cols = Object.values(columns);
    if (cols.some(c => c.length === 0)) return [];
    
    const combinations: { title: string; language: string }[] = [];
    const [services, cities, languages] = [
      columns.services || [],
      columns.cities || [],
      columns.languages || ["English"],
    ];

    for (const service of services.slice(0, 3)) {
      for (const city of cities.slice(0, 2)) {
        for (const lang of languages.slice(0, 2)) {
          combinations.push({
            title: `${service} in ${city}`,
            language: lang,
          });
        }
      }
    }
    return combinations.slice(0, 5);
  };

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {campaign.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{campaign.name}</h2>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Q4 Product Launch Campaign</p>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant={campaign.status === "Active" ? "default" : "secondary"} 
                className={campaign.status === "Active" ? "bg-green-500" : ""}>
                {campaign.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Created: {new Date(campaign.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">Campaign</p>
          <p className="text-muted-foreground text-xs">Edit your campaign details</p>
        </div>
      </div>

      {/* Business Details */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4">Business Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Website</Label>
              <Input defaultValue="techflow.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Business Type</Label>
              <Select defaultValue={campaign.businessType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map(bt => (
                    <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              <Input defaultValue="San Francisco, CA" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Industry</Label>
              <Select defaultValue="health">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="tech">Technology</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4">Statistics</h3>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold">
                <span className="text-primary">{campaign.pagesGenerated}</span>
                <span className="text-muted-foreground">/{campaign.totalPages}</span>
              </p>
              <p className="text-sm text-muted-foreground">Pages Generated</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{campaign.clicks}</p>
              <p className="text-sm text-muted-foreground">Total Clicks</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {Math.round((campaign.pagesGenerated / campaign.totalPages) * 100)}%
              </p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Setup */}
      <div>
        <h3 className="font-semibold mb-3">Data Setup</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-green-100">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">CSV Upload</p>
                    <p className="text-sm text-muted-foreground">product-data-2024.csv</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-3">
                <Progress value={100} className="h-2" />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">All columns mapped</span>
                  <span className="text-xs text-green-600 font-medium">3/3</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-blue-100">
                    <List className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Manual Inputs</p>
                    <p className="text-sm text-muted-foreground">Additional data entries</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-3">
                <p className="text-sm text-primary font-medium">25 items added</p>
                <p className="text-xs text-muted-foreground">Custom data uploaded</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Columns / Matrix Builder */}
      <div>
        <h3 className="font-semibold mb-3">Columns</h3>
        <div className="grid grid-cols-3 gap-4">
          {columnConfigs.map((config) => {
            const columnId = config.id;
            const items = columns[columnId] || [];
            return (
              <Card key={columnId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-medium">{config.name}</Label>
                    <span className="text-xs text-primary">{items.length}/100 items</span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input 
                          value={item} 
                          readOnly 
                          className="h-8 text-sm bg-muted/50"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => handleRemoveItem(columnId, index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Input
                      placeholder={config.placeholder}
                      value={newItems[columnId] || ""}
                      onChange={(e) => setNewItems(prev => ({ 
                        ...prev, 
                        [columnId]: e.target.value 
                      }))}
                      onKeyDown={(e) => e.key === "Enter" && handleAddItem(columnId)}
                      className="h-8 text-sm"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAddItem(columnId)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Generated Combinations */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Generated Combinations</h3>
            <span className="text-sm text-primary">{totalCombinations} combinations generated</span>
          </div>

          {totalCombinations > 200 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                You are approaching the 200 page limit
              </span>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Language</th>
                </tr>
              </thead>
              <tbody>
                {generateCombinations().map((combo, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">{combo.title}</td>
                    <td className="p-3">{combo.language}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Your final campaign will include all permutations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

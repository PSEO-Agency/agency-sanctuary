import { useState, useEffect } from "react";
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
import { Pencil, FileSpreadsheet, List, Plus, X, AlertTriangle, RefreshCw, Save } from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB } from "@/hooks/useCampaignPages";
import { BUSINESS_TYPES } from "../../types";
import { TitlePatternInput } from "../../TitlePatternInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MatrixBuilderTabProps {
  campaign: CampaignDB;
  pages: CampaignPageDB[];
  onRefreshPages: () => void;
}

export function MatrixBuilderTab({ campaign, pages, onRefreshPages }: MatrixBuilderTabProps) {
  const [columns, setColumns] = useState<Record<string, string[]>>(
    campaign.data_columns || {
      services: ["Teeth Whitening", "Dental Implants"],
      cities: ["Amsterdam", "Rotterdam", "Utrecht"],
      languages: ["English", "Dutch"],
    }
  );

  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [titlePattern, setTitlePattern] = useState<string>(
    (campaign.template_config as any)?.titlePattern || ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const businessType = BUSINESS_TYPES.find(bt => bt.id === campaign.business_type);
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

  const handleSaveMatrix = async () => {
    setIsSaving(true);
    try {
      // Update campaign with new data_columns and title pattern
      const { error } = await supabase
        .from("campaigns")
        .update({
          data_columns: columns,
          template_config: {
            ...(campaign.template_config as object || {}),
            titlePattern: titlePattern,
          },
        })
        .eq("id", campaign.id);

      if (error) throw error;
      toast.success("Matrix saved successfully!");
    } catch (err) {
      console.error("Error saving matrix:", err);
      toast.error("Failed to save matrix");
    } finally {
      setIsSaving(false);
    }
  };

  // Generate sample combinations from actual pages or calculate from columns
  const sampleCombinations = pages.slice(0, 5).map(p => ({
    title: p.title,
    status: p.status,
  }));

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={campaign.business_logo_url || ""} />
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
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant={campaign.status === "active" ? "default" : "secondary"} 
                className={campaign.status === "active" ? "bg-green-500" : ""}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Created: {new Date(campaign.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <Button onClick={handleSaveMatrix} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Title Pattern Configuration */}
      <Card>
        <CardContent className="p-4">
          <TitlePatternInput
            value={titlePattern}
            onChange={setTitlePattern}
            columns={columnConfigs}
            label="Page Title Pattern"
            placeholder={`e.g., {{${columnConfigs[0]?.id}}} in {{${columnConfigs[1]?.id}}}`}
          />
        </CardContent>
      </Card>

      {/* Business Details */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4">Business Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Website</Label>
              <Input defaultValue={campaign.website_url || ""} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Business Type</Label>
              <Select defaultValue={campaign.business_type || ""}>
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
              <Input defaultValue={campaign.business_address || ""} className="mt-1" />
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
                <span className="text-primary">{pages.filter(p => p.status === "generated" || p.status === "published").length}</span>
                <span className="text-muted-foreground">/{pages.length || campaign.total_pages}</span>
              </p>
              <p className="text-sm text-muted-foreground">Pages Generated</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">
                {campaign.clicks > 1000 ? `${(campaign.clicks / 1000).toFixed(1)}k` : campaign.clicks}
              </p>
              <p className="text-sm text-muted-foreground">Total Clicks</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {pages.length > 0 ? Math.round((pages.filter(p => p.status !== "draft").length / pages.length) * 100) : 0}%
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
          <Card className={`cursor-pointer hover:border-primary/50 transition-colors ${campaign.data_source_type === 'csv' ? 'border-primary' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-green-100">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">CSV Upload</p>
                    <p className="text-sm text-muted-foreground">
                      {campaign.data_source_type === 'csv' ? 'product-data.csv' : 'No file uploaded'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
              {campaign.data_source_type === 'csv' && (
                <div className="mt-3">
                  <Progress value={100} className="h-2" />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">All columns mapped</span>
                    <span className="text-xs text-green-600 font-medium">3/3</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`cursor-pointer hover:border-primary/50 transition-colors ${campaign.data_source_type === 'scratch' ? 'border-primary' : ''}`}>
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
                <p className="text-sm text-primary font-medium">
                  {Object.values(columns).flat().length} items added
                </p>
                <p className="text-xs text-muted-foreground">Custom data configured</p>
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

      {/* Generated Combinations / Pages */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Generated Pages</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-primary">{pages.length} pages created</span>
              <Button variant="outline" size="sm" onClick={onRefreshPages}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          {totalCombinations > 200 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                You are approaching the 200 page limit ({totalCombinations} combinations)
              </span>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sampleCombinations.length > 0 ? (
                  sampleCombinations.map((page, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">{page.title}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className={
                          page.status === "published" ? "bg-green-100 text-green-700" :
                          page.status === "generated" ? "bg-blue-100 text-blue-700" :
                          "bg-muted text-muted-foreground"
                        }>
                          {page.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t">
                    <td colSpan={2} className="p-3 text-center text-muted-foreground">
                      No pages generated yet. Add data to columns and save to generate pages.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Showing first 5 of {pages.length} pages. Your final campaign will include all permutations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

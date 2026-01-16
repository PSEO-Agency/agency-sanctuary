import { useState, useRef } from "react";
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
import { Pencil, FileSpreadsheet, List, Plus, X, AlertTriangle, RefreshCw, Save, Wand2, Loader2, Trash2 } from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB } from "@/hooks/useCampaignPages";
import { BUSINESS_TYPES, TitlePattern } from "../../types";
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
  const [titlePatterns, setTitlePatterns] = useState<TitlePattern[]>(
    (campaign.template_config as any)?.titlePatterns || []
  );
  const [newPattern, setNewPattern] = useState("");
  const [newUrlPrefix, setNewUrlPrefix] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const patternInputRef = useRef<HTMLInputElement>(null);

  const businessType = BUSINESS_TYPES.find(bt => bt.id === campaign.business_type);
  const columnConfigs = businessType?.columns || BUSINESS_TYPES[2].columns;

  // Calculate pages for a single pattern - only using variables IN that pattern
  const calculatePagesForPattern = (pattern: TitlePattern): number => {
    const patternLower = pattern.pattern.toLowerCase();
    const usedColumnIds = columnConfigs.filter(col => 
      patternLower.includes(`{{${col.id.toLowerCase()}}}`)
    ).map(col => col.id);

    if (usedColumnIds.length === 0) return 0;

    return usedColumnIds.reduce((acc, colId) => {
      const items = columns[colId] || [];
      return acc * (items.length || 1);
    }, 1);
  };

  const totalEstimatedPages = titlePatterns.reduce(
    (acc, pattern) => acc + calculatePagesForPattern(pattern),
    0
  );

  const insertVariable = (columnId: string) => {
    const placeholder = `{{${columnId}}}`;
    const input = patternInputRef.current;
    
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue = newPattern.slice(0, start) + placeholder + newPattern.slice(end);
      setNewPattern(newValue);
      
      setTimeout(() => {
        input.focus();
        const newPos = start + placeholder.length;
        input.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      setNewPattern(newPattern + placeholder);
    }
  };

  const addTitlePattern = () => {
    const pattern = newPattern.trim();
    if (!pattern) return;

    const newTitlePattern: TitlePattern = {
      id: `pattern-${Date.now()}`,
      pattern: pattern,
      urlPrefix: newUrlPrefix.trim() || undefined,
    };

    setTitlePatterns([...titlePatterns, newTitlePattern]);
    setNewPattern("");
    setNewUrlPrefix("");
  };

  const removeTitlePattern = (patternId: string) => {
    setTitlePatterns(titlePatterns.filter((p) => p.id !== patternId));
  };

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
      const { error } = await supabase
        .from("campaigns")
        .update({
          data_columns: columns,
          template_config: {
            ...(campaign.template_config as object || {}),
            titlePatterns: titlePatterns.map(p => ({
              id: p.id,
              pattern: p.pattern,
              urlPrefix: p.urlPrefix || null,
            })),
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

  const handleRegeneratePages = async () => {
    if (titlePatterns.length === 0) {
      toast.error("Please add at least one title pattern first");
      return;
    }

    setIsRegenerating(true);
    try {
      await handleSaveMatrix();

      // Delete existing pages
      const { error: deleteError } = await supabase
        .from("campaign_pages")
        .delete()
        .eq("campaign_id", campaign.id);

      if (deleteError) throw deleteError;

      // Generate new pages based on each pattern
      const newPages: Array<{
        campaign_id: string;
        subaccount_id: string;
        title: string;
        slug: string;
        data_values: Record<string, string>;
        status: string;
      }> = [];

      titlePatterns.forEach(pattern => {
        const patternLower = pattern.pattern.toLowerCase();
        
        // Find which columns this specific pattern uses
        const usedColumnIds = columnConfigs
          .filter(col => patternLower.includes(`{{${col.id.toLowerCase()}}}`))
          .map(col => col.id);

        if (usedColumnIds.length === 0) return;

        // Generate combinations ONLY for the columns used in this pattern
        const generateCombinations = (
          colIds: string[],
          currentValues: Record<string, string>,
          index: number
        ) => {
          if (index >= colIds.length) {
            // Generate title from pattern
            let title = pattern.pattern;
            Object.entries(currentValues).forEach(([key, value]) => {
              title = title.replace(new RegExp(`\\{\\{${key}\\}\\}`, "gi"), value);
            });

            // Generate slug from title
            const slug = (pattern.urlPrefix || "/") + title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");

            newPages.push({
              campaign_id: campaign.id,
              subaccount_id: campaign.subaccount_id,
              title: title,
              slug: slug,
              data_values: { ...currentValues, patternId: pattern.id },
              status: "draft",
            });
            return;
          }

          const colId = colIds[index];
          const items = columns[colId] || [];

          if (items.length === 0) {
            generateCombinations(colIds, currentValues, index + 1);
          } else {
            items.forEach(item => {
              generateCombinations(
                colIds,
                { ...currentValues, [colId]: item },
                index + 1
              );
            });
          }
        };

        generateCombinations(usedColumnIds, {}, 0);
      });

      // Insert new pages in batches
      if (newPages.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < newPages.length; i += batchSize) {
          const batch = newPages.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from("campaign_pages")
            .insert(batch);

          if (insertError) throw insertError;
        }
      }

      // Update campaign total_pages
      await supabase
        .from("campaigns")
        .update({ total_pages: newPages.length })
        .eq("id", campaign.id);

      toast.success(`Generated ${newPages.length} pages from ${titlePatterns.length} pattern(s)!`);
      onRefreshPages();
    } catch (err) {
      console.error("Error regenerating pages:", err);
      toast.error("Failed to regenerate pages");
    } finally {
      setIsRegenerating(false);
    }
  };

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

      {/* Title Patterns Section */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Title Patterns</h3>
              <p className="text-xs text-muted-foreground">
                Each pattern generates pages using only the variables it contains
              </p>
            </div>
            <span className="text-sm text-primary font-medium">
              {totalEstimatedPages} pages will be created
            </span>
          </div>

          {/* Existing Patterns List */}
          {titlePatterns.length > 0 && (
            <div className="space-y-2">
              {titlePatterns.map((pattern) => {
                const pageCount = calculatePagesForPattern(pattern);
                return (
                  <div
                    key={pattern.id}
                    className="flex items-center justify-between p-3 bg-background rounded-lg border group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono truncate">{pattern.pattern}</code>
                        {pattern.urlPrefix && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {pattern.urlPrefix}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        → Will generate {pageCount} pages
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeTitlePattern(pattern.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add New Pattern */}
          <div className="space-y-3 pt-3 border-t">
            <Label className="text-sm">Add New Pattern</Label>
            
            {/* Variable Buttons */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Insert variable:</span>
              {columnConfigs.map((col) => (
                <Button
                  key={col.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs font-mono bg-primary/5 hover:bg-primary/10 border-primary/20"
                  onClick={() => insertVariable(col.id)}
                >
                  {`{{${col.id}}}`}
                </Button>
              ))}
            </div>
            
            {/* Pattern Input with URL Prefix */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  ref={patternInputRef}
                  placeholder="e.g., What is {{services}} or Best {{services}} in {{cities}}"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTitlePattern();
                    }
                  }}
                  className="text-sm font-mono"
                />
              </div>
              <div className="w-32">
                <Input
                  placeholder="/url-prefix/"
                  value={newUrlPrefix}
                  onChange={(e) => setNewUrlPrefix(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>
              <Button
                variant="default"
                size="icon"
                onClick={addTitlePattern}
                disabled={!newPattern.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Preview */}
            {newPattern && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                <p className="text-sm font-medium">
                  {newPattern.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                    const col = columnConfigs.find(c => c.id.toLowerCase() === key.toLowerCase());
                    return col ? `[${col.name}]` : `{{${key}}}`;
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Regenerate Button */}
          <div className="flex items-center justify-between pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              Update patterns and regenerate to apply changes
            </p>
            <Button 
              onClick={handleRegeneratePages} 
              disabled={isRegenerating || titlePatterns.length === 0}
              className="gap-2"
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {isRegenerating ? "Regenerating..." : "Regenerate Pages"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Pages Preview */}
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

          {totalEstimatedPages > 200 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                You are approaching the 200 page limit ({totalEstimatedPages} pages estimated)
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
                      No pages generated yet. Add title patterns and click Regenerate Pages.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Showing first 5 of {pages.length} pages.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

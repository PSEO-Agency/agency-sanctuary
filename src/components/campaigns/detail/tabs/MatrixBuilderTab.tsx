import { useState, useRef, useCallback } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, FileSpreadsheet, List, Plus, X, AlertTriangle, RefreshCw, Save, Wand2, Loader2, Trash2, Tags, Sparkles } from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB } from "@/hooks/useCampaignPages";
import { BUSINESS_TYPES, TitlePattern, Entity, DynamicColumn } from "../../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MatrixBuilderTabProps {
  campaign: CampaignDB;
  pages: CampaignPageDB[];
  onRefreshPages: () => void;
}

// Extended TitlePattern for internal use that includes entity info
interface TitlePatternWithEntity extends TitlePattern {
  _urlPrefix?: string; // For display purposes
}

// Column config interface for display
interface ColumnConfig {
  id: string;
  name: string;
  placeholder: string;
}

export function MatrixBuilderTab({ campaign, pages, onRefreshPages }: MatrixBuilderTabProps) {
  // Get saved dynamic columns from campaign config or column_mappings
  const savedDynamicColumns: DynamicColumn[] = 
    (campaign.template_config as any)?.dynamicColumns ||
    (campaign.column_mappings as any)?.dynamicColumns ||
    [];

  // Fall back to business type defaults if no saved columns
  const businessType = BUSINESS_TYPES.find(bt => bt.id === campaign.business_type);
  
  // Build column configs from saved dynamic columns or business type defaults
  const columnConfigs: ColumnConfig[] = savedDynamicColumns.length > 0
    ? savedDynamicColumns.map((col: DynamicColumn) => ({
        id: col.variableName,
        name: col.displayName,
        placeholder: col.placeholder || `Add ${col.displayName}`,
      }))
    : (businessType?.columns || BUSINESS_TYPES[2].columns).map(col => ({
        id: col.id,
        name: col.name,
        placeholder: col.placeholder,
      }));

  const [columns, setColumns] = useState<Record<string, string[]>>(
    campaign.data_columns || (() => {
      // Initialize from saved columns or defaults
      const initial: Record<string, string[]> = {};
      columnConfigs.forEach(col => {
        initial[col.id] = [];
      });
      return initial;
    })()
  );

  const [newItems, setNewItems] = useState<Record<string, string>>({});
  
  // AI autofill state - per column for parallel generation
  const [generatingColumns, setGeneratingColumns] = useState<Set<string>>(new Set());
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [aiPrompts, setAiPrompts] = useState<Record<string, string>>({});

  // Initialize entities from campaign config
  const [entities, setEntities] = useState<Entity[]>(
    (campaign.template_config as any)?.entities || []
  );
  
  // Initialize title patterns with entityId
  const [titlePatterns, setTitlePatterns] = useState<TitlePattern[]>(() => {
    const patterns = (campaign.template_config as any)?.titlePatterns || [];
    // Migrate old patterns that have urlPrefix but no entityId
    return patterns.map((p: any) => {
      if (p.entityId) return p;
      // Create entity from urlPrefix for migration
      const entityId = `ent-migrated-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return { ...p, entityId };
    });
  });
  
  const [newPattern, setNewPattern] = useState("");
  const [newUrlPrefix, setNewUrlPrefix] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const patternInputRef = useRef<HTMLInputElement>(null);

  // Get entity for a pattern
  const getEntityForPattern = (pattern: TitlePattern): Entity | undefined => {
    return entities.find(e => e.id === pattern.entityId);
  };

  // Calculate pages for a single pattern
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

  // Calculate pages per entity
  const pagesPerEntity: Record<string, number> = {};
  titlePatterns.forEach(pattern => {
    const count = calculatePagesForPattern(pattern);
    pagesPerEntity[pattern.entityId] = (pagesPerEntity[pattern.entityId] || 0) + count;
  });

  const totalEstimatedPages = titlePatterns.reduce(
    (acc, pattern) => acc + calculatePagesForPattern(pattern),
    0
  );

  // AI generate items - per column for parallel generation
  const handleAIGenerate = useCallback(async (columnId: string) => {
    const prompt = aiPrompts[columnId];
    if (!prompt?.trim()) return;
    
    // Add this column to generating set
    setGeneratingColumns(prev => new Set(prev).add(columnId));
    
    try {
      const column = columnConfigs.find(c => c.id === columnId);
      const existingItems = columns[columnId] || [];
      
      const response = await supabase.functions.invoke("generate-column-items", {
        body: {
          column_name: column?.name,
          business_type: campaign.business_type,
          business_name: campaign.business_name,
          prompt: prompt,
          existing_items: existingItems,
          max_items: 20,
        },
      });
      
      if (response.error) {
        if (response.error.message?.includes("429")) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (response.error.message?.includes("402")) {
          toast.error("AI credits exhausted. Please add funds to continue.");
        } else {
          toast.error("Failed to generate items: " + response.error.message);
        }
        return;
      }
      
      if (response.data?.items && Array.isArray(response.data.items)) {
        const newItems = response.data.items.filter(
          (item: string) => !existingItems.includes(item)
        );
        
        if (newItems.length > 0) {
          setColumns(prev => ({
            ...prev,
            [columnId]: [...existingItems, ...newItems],
          }));
          
          toast.success(`Added ${newItems.length} items to ${column?.name}`);
        } else {
          toast.info("No new items to add (all generated items already exist)");
        }
      } else {
        toast.error("Unexpected response from AI");
      }
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error("Failed to generate items");
    } finally {
      // Remove from generating set
      setGeneratingColumns(prev => {
        const next = new Set(prev);
        next.delete(columnId);
        return next;
      });
      // Clear only this column's prompt
      setAiPrompts(prev => ({ ...prev, [columnId]: "" }));
    }
  }, [aiPrompts, columns, columnConfigs, campaign.business_type, campaign.business_name]);

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

    let entityId = selectedEntityId;

    // Auto-create entity if none selected
    if (!entityId) {
      const match = pattern.match(/\{\{(\w+)\}\}/);
      if (match) {
        const varName = match[1];
        const existingEntity = entities.find(e => e.variableHint === varName);
        
        if (existingEntity) {
          entityId = existingEntity.id;
        } else {
          const newEntity: Entity = {
            id: `ent-${Date.now()}`,
            name: varName.charAt(0).toUpperCase() + varName.slice(1),
            urlPrefix: newUrlPrefix.trim() || `/${varName.toLowerCase()}/`,
            variableHint: varName,
          };
          setEntities([...entities, newEntity]);
          entityId = newEntity.id;
        }
      } else {
        // Create general entity
        const generalEntity: Entity = {
          id: `ent-general-${Date.now()}`,
          name: "General",
          urlPrefix: newUrlPrefix.trim() || "/",
        };
        setEntities([...entities, generalEntity]);
        entityId = generalEntity.id;
      }
    }

    const newTitlePattern: TitlePattern = {
      id: `pattern-${Date.now()}`,
      pattern: pattern,
      entityId: entityId!,
    };

    setTitlePatterns([...titlePatterns, newTitlePattern]);
    setNewPattern("");
    setNewUrlPrefix("");
    setSelectedEntityId(null);
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
      // Prepare template config as JSON-compatible object
      const updatedTemplateConfig = {
        ...(campaign.template_config as object || {}),
        entities: entities.map(e => ({
          id: e.id,
          name: e.name,
          urlPrefix: e.urlPrefix,
          variableHint: e.variableHint || null,
        })),
        titlePatterns: titlePatterns.map(p => ({
          id: p.id,
          pattern: p.pattern,
          entityId: p.entityId,
        })),
      };

      const { error } = await supabase
        .from("campaigns")
        .update({
          data_columns: columns as any,
          template_config: updatedTemplateConfig as any,
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
        const entity = getEntityForPattern(pattern);
        const urlPrefix = entity?.urlPrefix || "/";
        
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
            const slug = urlPrefix + title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");

            newPages.push({
              campaign_id: campaign.id,
              subaccount_id: campaign.subaccount_id,
              title: title,
              slug: slug,
              data_values: { ...currentValues, patternId: pattern.id, entityId: pattern.entityId },
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

      {/* Datasets / Matrix Builder */}
      <div>
        <h3 className="font-semibold mb-3">Datasets</h3>
        <div className="grid grid-cols-3 gap-4">
          {columnConfigs.map((config) => {
            const columnId = config.id;
            const items = columns[columnId] || [];
            const isGenerating = generatingColumns.has(columnId);
            
            return (
              <Card key={columnId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-medium">{config.name}</Label>
                    <div className="flex items-center gap-1">
                      {/* AI Autofill Button */}
                      <Popover 
                        open={openPopoverId === columnId} 
                        onOpenChange={(open) => {
                          if (open) {
                            setOpenPopoverId(columnId);
                          } else {
                            setOpenPopoverId(null);
                            if (!generatingColumns.has(columnId)) {
                              setAiPrompts(prev => ({ ...prev, [columnId]: "" }));
                            }
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            {isGenerating ? (
                              <Loader2 className="h-3 w-3 text-primary animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3 text-primary" />
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-3">
                            <h4 className="font-medium flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              AI Autofill
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Describe what items to generate for "{config.name}"
                            </p>
                            <Input
                              placeholder="e.g., Cities in France, Plumbing services..."
                              value={aiPrompts[columnId] || ""}
                              onChange={(e) => setAiPrompts(prev => ({ ...prev, [columnId]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && (aiPrompts[columnId] || "").trim() && !isGenerating) {
                                  handleAIGenerate(columnId);
                                }
                              }}
                              disabled={isGenerating}
                              autoFocus
                            />
                            <Button 
                              className="w-full" 
                              onClick={() => handleAIGenerate(columnId)}
                              disabled={!(aiPrompts[columnId] || "").trim() || isGenerating}
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Generate Items
                                </>
                              )}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <span className="text-xs text-primary">{items.length}/100</span>
                    </div>
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
              <h3 className="font-semibold">Title Patterns by Entity</h3>
              <p className="text-xs text-muted-foreground">
                Each pattern is grouped by entity for organized page generation
              </p>
            </div>
            <span className="text-sm text-primary font-medium">
              {totalEstimatedPages} pages will be created
            </span>
          </div>

          {/* Existing Patterns List - Grouped by Entity */}
          {titlePatterns.length > 0 && (
            <div className="space-y-4">
              {entities.map((entity) => {
                const entityPatterns = titlePatterns.filter(p => p.entityId === entity.id);
                if (entityPatterns.length === 0) return null;

                return (
                  <div key={entity.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Tags className="h-3 w-3 mr-1" />
                        {entity.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {entity.urlPrefix}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {pagesPerEntity[entity.id] || 0} pages
                      </span>
                    </div>
                    {entityPatterns.map((pattern) => {
                      const pageCount = calculatePagesForPattern(pattern);
                      return (
                        <div
                          key={pattern.id}
                          className="flex items-center justify-between p-3 bg-background rounded-lg border group ml-4"
                        >
                          <div className="flex-1 min-w-0">
                            <code className="text-sm font-mono truncate">{pattern.pattern}</code>
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
                );
              })}
            </div>
          )}

          {/* Add New Pattern */}
          <div className="space-y-3 pt-3 border-t">
            <Label className="text-sm">Add New Pattern</Label>
            
            {/* Entity Selector */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Entity:</Label>
              <Select
                value={selectedEntityId || "auto"}
                onValueChange={(v) => setSelectedEntityId(v === "auto" ? null : v)}
              >
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <span className="text-muted-foreground">Auto-detect from pattern</span>
                  </SelectItem>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name} ({entity.urlPrefix})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedEntityId && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="/url-prefix/"
                    value={newUrlPrefix}
                    onChange={(e) => setNewUrlPrefix(e.target.value)}
                    className="h-8 text-sm font-mono w-32"
                  />
                </div>
              )}
            </div>
            
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
            
            {/* Pattern Input */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  ref={patternInputRef}
                  placeholder={
                    columnConfigs.length >= 2
                      ? `e.g., What is {{${columnConfigs[0].id}}} or Best {{${columnConfigs[0].id}}} in {{${columnConfigs[1].id}}}`
                      : columnConfigs.length === 1
                      ? `e.g., What is {{${columnConfigs[0].id}}}`
                      : "e.g., What is {{variable}}"
                  }
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

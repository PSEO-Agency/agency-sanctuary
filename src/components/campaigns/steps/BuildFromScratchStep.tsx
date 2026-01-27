import { useState, useRef, useEffect } from "react";
import { Plus, X, Trash2, Tags, ChevronLeft, GripVertical, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CampaignFormData, BUSINESS_TYPES, DynamicColumn, TitlePattern, Entity } from "../types";
import { EntitySelector, suggestEntityFromPattern } from "../EntitySelector";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BuildFromScratchStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
}

// Sanitize variable name to only allow alphanumeric and underscore
const sanitizeVariableName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
};

export function BuildFromScratchStep({ formData, updateFormData }: BuildFromScratchStepProps) {
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [editingColumn, setEditingColumn] = useState<{ columnId: string; displayName: string; variableName: string } | null>(null);
  const [newPattern, setNewPattern] = useState("");
  const [newUrlPrefix, setNewUrlPrefix] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isCreatingEntity, setIsCreatingEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");
  const patternInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop state
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Collapse state
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  // Delete state
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

  // AI autofill state
  const [aiColumnId, setAiColumnId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize dynamic columns from business type if not already set
  useEffect(() => {
    if (formData.dynamicColumns.length === 0 && formData.businessType) {
      const businessType = BUSINESS_TYPES.find((t) => t.id === formData.businessType);
      if (businessType) {
        const initialColumns: DynamicColumn[] = businessType.columns.map((col) => ({
          id: `col-${col.id}-${Date.now()}`,
          variableName: col.id,
          displayName: col.name,
          placeholder: col.placeholder,
        }));
        
        // Initialize scratch data with empty arrays for each column
        const initialScratchData: Record<string, string[]> = {};
        initialColumns.forEach((col) => {
          initialScratchData[col.id] = [];
        });
        
        updateFormData({
          dynamicColumns: initialColumns,
          scratchData: initialScratchData,
        });
      }
    }
  }, [formData.businessType, formData.dynamicColumns.length, updateFormData]);

  // Get columns from dynamic columns or fallback
  const columns = formData.dynamicColumns.length > 0 
    ? formData.dynamicColumns 
    : [
        { id: "col-1", variableName: "column1", displayName: "Column 1", placeholder: "Add Item" },
        { id: "col-2", variableName: "column2", displayName: "Column 2", placeholder: "Add Item" },
        { id: "col-3", variableName: "column3", displayName: "Column 3", placeholder: "Add Item" },
      ];

  const entities = formData.entities || [];

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (columnId !== draggedColumn) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) {
      handleDragEnd();
      return;
    }
    
    const cols = [...formData.dynamicColumns];
    const dragIndex = cols.findIndex(c => c.id === draggedColumn);
    const targetIndex = cols.findIndex(c => c.id === targetColumnId);
    
    if (dragIndex === -1 || targetIndex === -1) {
      handleDragEnd();
      return;
    }
    
    const [removed] = cols.splice(dragIndex, 1);
    cols.splice(targetIndex, 0, removed);
    
    updateFormData({ dynamicColumns: cols });
    handleDragEnd();
  };

  // Collapse toggle
  const toggleCollapse = (columnId: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  // Delete column
  const handleDeleteColumn = (columnId: string) => {
    const column = formData.dynamicColumns.find(c => c.id === columnId);
    if (!column) return;
    
    // Remove column from dynamicColumns
    const updatedColumns = formData.dynamicColumns.filter(c => c.id !== columnId);
    
    // Remove column data from scratchData
    const { [columnId]: removed, ...updatedScratchData } = formData.scratchData;
    
    // Remove patterns that reference this variable
    const varPattern = `{{${column.variableName}}}`;
    const updatedPatterns = (formData.titlePatterns || []).filter(pattern => {
      return !pattern.pattern.toLowerCase().includes(varPattern.toLowerCase());
    });
    
    const patternsRemoved = (formData.titlePatterns || []).length - updatedPatterns.length;
    
    updateFormData({
      dynamicColumns: updatedColumns,
      scratchData: updatedScratchData,
      titlePatterns: updatedPatterns,
    });
    
    setColumnToDelete(null);
    
    if (patternsRemoved > 0) {
      toast.warning(`${patternsRemoved} pattern(s) using {{${column.variableName}}} were removed`);
    } else {
      toast.success(`Column "${column.displayName}" deleted`);
    }
  };

  // AI generate items
  const handleAIGenerate = async (columnId: string, prompt: string) => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const column = formData.dynamicColumns.find(c => c.id === columnId);
      const existingItems = formData.scratchData[columnId] || [];
      
      const response = await supabase.functions.invoke("generate-column-items", {
        body: {
          column_name: column?.displayName,
          business_type: formData.businessType,
          business_name: formData.businessName,
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
          updateFormData({
            scratchData: {
              ...formData.scratchData,
              [columnId]: [...existingItems, ...newItems],
            },
          });
          
          toast.success(`Added ${newItems.length} items to ${column?.displayName}`);
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
      setIsGenerating(false);
      setAiColumnId(null);
      setAiPrompt("");
    }
  };

  const handleColumnRename = (columnId: string, newDisplayName: string, newVariableName: string) => {
    const oldColumn = formData.dynamicColumns.find(c => c.id === columnId);
    if (!oldColumn) return;

    const sanitizedVarName = sanitizeVariableName(newVariableName);
    
    // Check for duplicate variable names
    const isDuplicate = formData.dynamicColumns.some(
      c => c.id !== columnId && c.variableName === sanitizedVarName
    );
    
    if (isDuplicate) {
      let suffix = 1;
      while (formData.dynamicColumns.some(
        c => c.id !== columnId && c.variableName === `${sanitizedVarName}${suffix}`
      )) {
        suffix++;
      }
      return handleColumnRename(columnId, newDisplayName, `${sanitizedVarName}${suffix}`);
    }

    const oldVar = `{{${oldColumn.variableName}}}`;
    const newVar = `{{${sanitizedVarName}}}`;

    // Update column configuration (including placeholder for dynamic button text)
    const updatedColumns = formData.dynamicColumns.map(col =>
      col.id === columnId 
        ? { 
            ...col, 
            displayName: newDisplayName, 
            variableName: sanitizedVarName,
            placeholder: `Add ${newDisplayName}`,
          } 
        : col
    );

    // Update all title patterns that reference this variable
    const updatedPatterns = formData.titlePatterns.map(pattern => ({
      ...pattern,
      pattern: pattern.pattern.replace(new RegExp(oldVar.replace(/[{}]/g, '\\$&'), 'gi'), newVar)
    }));

    // Update entity variableHints if they reference the old variable
    const updatedEntities = (formData.entities || []).map(entity =>
      entity.variableHint === oldColumn.variableName
        ? { ...entity, variableHint: sanitizedVarName }
        : entity
    );

    updateFormData({
      dynamicColumns: updatedColumns,
      titlePatterns: updatedPatterns,
      entities: updatedEntities,
    });
  };

  const addItem = (columnId: string) => {
    const item = newItems[columnId]?.trim();
    if (!item) return;

    const currentItems = formData.scratchData[columnId] || [];
    updateFormData({
      scratchData: {
        ...formData.scratchData,
        [columnId]: [...currentItems, item],
      },
    });
    setNewItems({ ...newItems, [columnId]: "" });
  };

  const removeItem = (columnId: string, index: number) => {
    const currentItems = formData.scratchData[columnId] || [];
    updateFormData({
      scratchData: {
        ...formData.scratchData,
        [columnId]: currentItems.filter((_, i) => i !== index),
      },
    });
  };

  const handleAddColumn = () => {
    const newColId = `col-custom-${Date.now()}`;
    const columnNumber = formData.dynamicColumns.length + 1;
    const newColumn: DynamicColumn = {
      id: newColId,
      variableName: `column_${columnNumber}`,
      displayName: `Column ${columnNumber}`,
      placeholder: `Add Column ${columnNumber}`,
    };
    
    updateFormData({
      dynamicColumns: [...formData.dynamicColumns, newColumn],
      scratchData: {
        ...formData.scratchData,
        [newColId]: [],
      },
    });
    
    // Auto-open edit mode for the new column
    setEditingColumn({
      columnId: newColId,
      displayName: newColumn.displayName,
      variableName: newColumn.variableName,
    });
  };

  const insertVariable = (variableName: string) => {
    const placeholder = `{{${variableName}}}`;
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

  const handleCreateEntity = (entity: Entity) => {
    updateFormData({
      entities: [...entities, entity],
    });
    setSelectedEntityId(entity.id);
    setIsCreatingEntity(false);
    setNewEntityName("");
  };

  const addTitlePattern = () => {
    const pattern = newPattern.trim();
    if (!pattern) return;

    let entityId = selectedEntityId;

    // Auto-create entity if none selected
    if (!entityId) {
      const suggestedEntity = suggestEntityFromPattern(pattern, newUrlPrefix.trim(), entities);
      if (suggestedEntity) {
        // Check if entity with same name exists
        const existingEntity = entities.find(
          e => e.name.toLowerCase() === suggestedEntity.name.toLowerCase()
        );
        
        if (existingEntity) {
          entityId = existingEntity.id;
        } else {
          // Create new entity
          const newEntity: Entity = {
            ...suggestedEntity,
            urlPrefix: newUrlPrefix.trim() || suggestedEntity.urlPrefix,
          };
          updateFormData({
            entities: [...entities, newEntity],
          });
          entityId = newEntity.id;
        }
      } else {
        // Create a "General" entity
        const generalEntity: Entity = {
          id: `ent-general-${Date.now()}`,
          name: "General",
          urlPrefix: newUrlPrefix.trim() || "/",
        };
        updateFormData({
          entities: [...entities, generalEntity],
        });
        entityId = generalEntity.id;
      }
    }

    const newTitlePattern: TitlePattern = {
      id: `pattern-${Date.now()}`,
      pattern: pattern,
      entityId: entityId!,
    };

    updateFormData({
      titlePatterns: [...(formData.titlePatterns || []), newTitlePattern],
    });
    setNewPattern("");
    setNewUrlPrefix("");
    setSelectedEntityId(null);
  };

  const removeTitlePattern = (patternId: string) => {
    updateFormData({
      titlePatterns: (formData.titlePatterns || []).filter((p) => p.id !== patternId),
    });
  };

  // Get entity for a pattern
  const getEntityForPattern = (pattern: TitlePattern): Entity | undefined => {
    return entities.find(e => e.id === pattern.entityId);
  };

  // Calculate estimated pages for a pattern
  const calculatePagesForPattern = (pattern: TitlePattern): number => {
    const patternLower = pattern.pattern.toLowerCase();
    const usedColumns = columns.filter(col => 
      patternLower.includes(`{{${col.variableName.toLowerCase()}}}`)
    );

    if (usedColumns.length === 0) return 0;

    return usedColumns.reduce((acc, col) => {
      const items = formData.scratchData[col.id] || [];
      return acc * (items.length || 1);
    }, 1);
  };

  // Calculate pages per entity
  const pagesPerEntity: Record<string, number> = {};
  (formData.titlePatterns || []).forEach(pattern => {
    const count = calculatePagesForPattern(pattern);
    pagesPerEntity[pattern.entityId] = (pagesPerEntity[pattern.entityId] || 0) + count;
  });

  // Calculate total pages across all patterns
  const totalEstimatedPages = (formData.titlePatterns || []).reduce(
    (acc, pattern) => acc + calculatePagesForPattern(pattern),
    0
  );

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Add Your Data</h2>
        <p className="text-muted-foreground">
          Enter your data in the columns below, then add title patterns to generate pages.
        </p>
      </div>

      {/* Columns - Horizontal Side-by-Side Layout with Contained Scroll */}
      <div className="relative w-full max-w-full">
        <div className="flex flex-row gap-3 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'thin', maxWidth: '100%' }}>
        {columns.map((col) => {
          const items = formData.scratchData[col.id] || [];
          const isCollapsed = collapsedColumns.has(col.id);
          const isDragging = draggedColumn === col.id;
          const isDragOver = dragOverColumn === col.id;
          
          // Collapsed column
          if (isCollapsed) {
            return (
              <div
                key={col.id}
                draggable
                onDragStart={(e) => handleDragStart(e, col.id)}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                onDragEnd={handleDragEnd}
                onClick={() => toggleCollapse(col.id)}
                className={cn(
                  "flex-shrink-0 w-12 min-h-[350px] border rounded-xl flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-all",
                  isDragOver && "ring-2 ring-primary ring-offset-2",
                  isDragging && "opacity-50"
                )}
              >
                <span 
                  className="font-semibold text-sm whitespace-nowrap text-muted-foreground"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  {col.displayName} ({items.length})
                </span>
              </div>
            );
          }
          
          // Expanded column
          return (
            <div
              key={col.id}
              draggable
              onDragStart={(e) => handleDragStart(e, col.id)}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex-shrink-0 w-64 border rounded-xl p-4 space-y-3 transition-all",
                isDragOver && "ring-2 ring-primary ring-offset-2",
                isDragging && "opacity-50"
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                
                {editingColumn?.columnId === col.id ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editingColumn.displayName}
                      onChange={(e) => setEditingColumn({ ...editingColumn, displayName: e.target.value })}
                      placeholder="Column Name"
                      className="h-7 text-sm font-semibold"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingColumn.displayName.trim()) {
                          handleColumnRename(col.id, editingColumn.displayName, editingColumn.displayName);
                          setEditingColumn(null);
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground font-mono">
                      → Variable: {`{{${sanitizeVariableName(editingColumn.displayName) || "variable"}}}`}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-6 text-xs"
                        disabled={!editingColumn.displayName.trim()}
                        onClick={() => {
                          handleColumnRename(col.id, editingColumn.displayName, editingColumn.displayName);
                          setEditingColumn(null);
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => setEditingColumn(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setEditingColumn({ 
                        columnId: col.id, 
                        displayName: col.displayName,
                        variableName: col.variableName 
                      })}
                      className="font-semibold hover:text-primary transition-colors text-left truncate block text-sm w-full"
                    >
                      {col.displayName}
                    </button>
                    <span className="text-[10px] text-muted-foreground/70 font-mono truncate block">
                      {`{{${col.variableName}}}`}
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-0 flex-shrink-0">
                  {/* AI Magic Wand */}
                  <Popover open={aiColumnId === col.id} onOpenChange={(open) => {
                    if (!open) {
                      setAiColumnId(null);
                      setAiPrompt("");
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => setAiColumnId(col.id)}
                      >
                        <Sparkles className="h-3 w-3 text-primary" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          AI Autofill
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Describe what items to generate for "{col.displayName}"
                        </p>
                        <Input
                          placeholder="e.g., Cities in France, Plumbing services..."
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && aiPrompt.trim() && !isGenerating) {
                              handleAIGenerate(col.id, aiPrompt);
                            }
                          }}
                          autoFocus
                        />
                        <Button 
                          className="w-full" 
                          onClick={() => handleAIGenerate(col.id, aiPrompt)}
                          disabled={!aiPrompt.trim() || isGenerating}
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

                  {/* Delete Column */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={() => setColumnToDelete(col.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>

                  {/* Collapse Column */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => toggleCollapse(col.id)}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Items count */}
              <span className="text-sm text-primary">{items.length}/100 items</span>

              {/* Items List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg group"
                  >
                    <span className="text-sm truncate">{item}</span>
                    <button
                      onClick={() => removeItem(col.id, index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Item */}
              <div className="flex gap-2">
                <Input
                  placeholder={col.placeholder}
                  value={newItems[col.id] || ""}
                  onChange={(e) => setNewItems({ ...newItems, [col.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem(col.id);
                    }
                  }}
                  className="text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => addItem(col.id)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add {col.displayName}
              </Button>
            </div>
          );
        })}
        
        {/* Add New Column Card */}
        <div 
          className="flex-shrink-0 w-40 border rounded-xl p-4 flex items-center justify-center min-h-[350px] border-dashed hover:border-primary transition-colors cursor-pointer"
          onClick={handleAddColumn}
        >
          <Button variant="ghost" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Column
          </Button>
        </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!columnToDelete} onOpenChange={() => setColumnToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{columnToDelete && formData.dynamicColumns.find(c => c.id === columnToDelete)?.displayName}" 
              and all its items. Patterns using this variable will also be removed.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => columnToDelete && handleDeleteColumn(columnToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Title Patterns Section */}
      <div className="border rounded-xl p-6 space-y-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Title Patterns by Entity</h3>
          <span className="text-sm text-primary font-medium">
            {totalEstimatedPages} pages will be created
          </span>
        </div>

        {/* Existing Patterns List - Grouped by Entity */}
        {(formData.titlePatterns || []).length > 0 && (
          <div className="space-y-4">
            {entities.map((entity) => {
              const entityPatterns = (formData.titlePatterns || []).filter(
                p => p.entityId === entity.id
              );
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
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setIsCreatingEntity(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              New Entity
            </Button>
          </div>

          {/* Create Entity Inline */}
          {isCreatingEntity && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Input
                placeholder="Entity name (e.g., Services)"
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="/url-prefix/"
                value={newUrlPrefix}
                onChange={(e) => setNewUrlPrefix(e.target.value)}
                className="h-8 text-sm font-mono w-32"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (newEntityName.trim()) {
                    handleCreateEntity({
                      id: `ent-${Date.now()}`,
                      name: newEntityName.trim(),
                      urlPrefix: newUrlPrefix.trim() || `/${newEntityName.toLowerCase().replace(/\s+/g, "-")}/`,
                    });
                  }
                }}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCreatingEntity(false);
                  setNewEntityName("");
                }}
              >
                Cancel
              </Button>
            </div>
          )}
          
          {/* Variable Buttons */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Insert variable:</span>
            {columns.map((col) => (
              <Button
                key={col.id}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs font-mono bg-primary/5 hover:bg-primary/10 border-primary/20"
                onClick={() => insertVariable(col.variableName)}
              >
                {`{{${col.variableName}}}`}
              </Button>
            ))}
          </div>
          
          {/* Pattern Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                ref={patternInputRef}
                placeholder={`e.g., What is {{${columns[0]?.variableName || 'services'}}} or Best {{${columns[0]?.variableName || 'services'}}} in {{${columns[1]?.variableName || 'cities'}}}`}
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
                  const col = columns.find(c => c.variableName.toLowerCase() === key.toLowerCase());
                  return col ? `[${col.displayName}]` : `{{${key}}}`;
                })}
              </p>
              {!selectedEntityId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Entity will be auto-created based on the first variable
                </p>
              )}
            </div>
          )}
        </div>

        {(formData.titlePatterns || []).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No patterns yet. Add a title pattern above to start generating pages.
          </p>
        )}
      </div>
    </div>
  );
}

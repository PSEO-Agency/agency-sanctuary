import { useState } from "react";
import { Plus, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampaignFormData, BUSINESS_TYPES, ColumnConfig } from "../types";
import { TitlePatternInput } from "../TitlePatternInput";
import { cn } from "@/lib/utils";

interface BuildFromScratchStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
}

export function BuildFromScratchStep({ formData, updateFormData }: BuildFromScratchStepProps) {
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [editingColumn, setEditingColumn] = useState<{ columnId: string; name: string } | null>(null);
  const [columnNames, setColumnNames] = useState<Record<string, string>>({});
  const [newCustomTitle, setNewCustomTitle] = useState("");

  // Get columns based on business type
  const businessType = BUSINESS_TYPES.find((t) => t.id === formData.businessType);
  const columns: ColumnConfig[] = businessType?.columns || [
    { id: "column1", name: "Column 1", placeholder: "Add Item" },
    { id: "column2", name: "Column 2", placeholder: "Add Item" },
    { id: "column3", name: "Column 3", placeholder: "Add Item" },
  ];

  const getColumnName = (col: ColumnConfig) => columnNames[col.id] || col.name;

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

  const addCustomTitle = () => {
    const title = newCustomTitle.trim();
    if (!title) return;

    const newTitle = {
      id: `custom-${Date.now()}`,
      title: title,
      language: "Default",
    };

    updateFormData({
      generatedTitles: [...formData.generatedTitles, newTitle],
    });
    setNewCustomTitle("");
  };

  const removeTitle = (titleId: string) => {
    updateFormData({
      generatedTitles: formData.generatedTitles.filter((t) => t.id !== titleId),
    });
  };

  const generateTitles = () => {
    const titles: { id: string; title: string; language: string }[] = [];
    
    // Get all column data that has items
    const columnData: Record<string, string[]> = {};
    const activeColumnIds: string[] = [];
    
    columns.forEach(col => {
      const items = formData.scratchData[col.id] || [];
      if (items.length > 0) {
        columnData[col.id] = items;
        activeColumnIds.push(col.id);
      }
    });

    // If no data, return
    if (activeColumnIds.length === 0) return;

    // Use pattern if set, otherwise default to first column
    const pattern = formData.titlePattern?.trim() || `{{${activeColumnIds[0]}}}`;

    // Find which columns are used in the pattern (case-insensitive)
    const patternLower = pattern.toLowerCase();
    const usedColumns = activeColumnIds.filter(colId => 
      patternLower.includes(`{{${colId.toLowerCase()}}}`)
    );

    // If pattern doesn't match any columns, use all active columns
    const columnsToUse = usedColumns.length > 0 ? usedColumns : activeColumnIds;

    if (columnsToUse.length === 1) {
      // Single column mode - just list items
      const primaryColumn = columnsToUse[0];
      const items = columnData[primaryColumn] || [];
      
      items.forEach(item => {
        let title = pattern;
        // Replace the column placeholder with the item value
        title = title.replace(new RegExp(`\\{\\{${primaryColumn}\\}\\}`, "gi"), item);
        // Clear any remaining placeholders
        columns.forEach(col => {
          title = title.replace(new RegExp(`\\{\\{${col.id}\\}\\}`, "gi"), "");
        });
        title = title.trim();
        
        // If title is empty after replacement, just use the item
        if (!title) title = item;
        
        titles.push({
          id: `${primaryColumn}-${item}-${Date.now()}`,
          title: title,
          language: "Default",
        });
      });
    } else {
      // Multiple columns - generate combinations
      const generateCombinations = (
        columnIds: string[],
        currentValues: Record<string, string>,
        index: number
      ) => {
        if (index >= columnIds.length) {
          let title = pattern;
          Object.entries(currentValues).forEach(([key, value]) => {
            title = title.replace(new RegExp(`\\{\\{${key}\\}\\}`, "gi"), value);
          });
          
          titles.push({
            id: `${Object.values(currentValues).join("-")}-${Date.now()}-${Math.random()}`,
            title: title,
            language: "Default",
          });
          return;
        }

        const colId = columnIds[index];
        const items = columnData[colId] || [];
        
        if (items.length === 0) {
          generateCombinations(columnIds, currentValues, index + 1);
        } else {
          items.forEach(item => {
            generateCombinations(
              columnIds, 
              { ...currentValues, [colId]: item }, 
              index + 1
            );
          });
        }
      };

      generateCombinations(columnsToUse, {}, 0);
    }

    // Preserve existing custom titles and add new generated ones
    const existingCustomTitles = formData.generatedTitles.filter(t => t.id.startsWith('custom-'));
    updateFormData({ generatedTitles: [...titles.slice(0, 50), ...existingCustomTitles] });
  };

  const totalTitles = formData.generatedTitles.length;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Add Your Data</h2>
        <p className="text-muted-foreground">
          Enter your data in the columns below. We'll generate your campaign pages.
        </p>
      </div>

      {/* Title Pattern Input */}
      <div className="border rounded-xl p-4 bg-muted/30">
        <TitlePatternInput
          value={formData.titlePattern}
          onChange={(titlePattern) => updateFormData({ titlePattern })}
          columns={columns}
          label="Page Title Pattern"
          placeholder={`e.g., {{${columns[0]?.id}}} or {{${columns[0]?.id}}} in {{${columns[1]?.id}}}`}
        />
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => {
          const items = formData.scratchData[col.id] || [];
          const displayName = getColumnName(col);
          
          return (
            <div key={col.id} className="border rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                {editingColumn?.columnId === col.id ? (
                  <Input
                    value={editingColumn.name}
                    onChange={(e) => setEditingColumn({ ...editingColumn, name: e.target.value })}
                    onBlur={() => {
                      setColumnNames({ ...columnNames, [col.id]: editingColumn.name });
                      setEditingColumn(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setColumnNames({ ...columnNames, [col.id]: editingColumn.name });
                        setEditingColumn(null);
                      }
                    }}
                    className="h-7 text-sm font-semibold"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setEditingColumn({ columnId: col.id, name: displayName })}
                    className="font-semibold hover:text-primary transition-colors"
                  >
                    {displayName}
                  </button>
                )}
                <span className="text-sm text-primary">{items.length}/100 items</span>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg group"
                  >
                    <span className="text-sm">{item}</span>
                    <button
                      onClick={() => removeItem(col.id, index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
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
                {col.placeholder}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Generate Titles Button */}
      <Button onClick={generateTitles} className="bg-primary">
        <Wand2 className="h-4 w-4 mr-2" />
        Generate Titles
      </Button>

      {/* Generated Titles Preview */}
      <div className="border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Generated Titles</h3>
          <span className="text-sm text-primary">{totalTitles} titles</span>
        </div>
        
        {/* Add Custom Title */}
        <div className="flex gap-2">
          <Input
            placeholder="Add a custom title..."
            value={newCustomTitle}
            onChange={(e) => setNewCustomTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTitle();
              }
            }}
            className="text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={addCustomTitle}
            disabled={!newCustomTitle.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {formData.generatedTitles.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr,auto,auto] gap-4 p-3 bg-muted/50 text-sm font-medium">
              <span>Title</span>
              <span>Type</span>
              <span></span>
            </div>
            {formData.generatedTitles.map((title, index) => (
              <div
                key={title.id}
                className={cn(
                  "grid grid-cols-[1fr,auto,auto] gap-4 p-3 text-sm items-center group",
                  index !== formData.generatedTitles.length - 1 && "border-b"
                )}
              >
                <span>{title.title}</span>
                <span className="text-muted-foreground text-xs px-2 py-0.5 bg-muted rounded">
                  {title.id.startsWith('custom-') ? 'Custom' : 'Generated'}
                </span>
                <button
                  onClick={() => removeTitle(title.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No titles yet. Add data and generate titles, or add custom titles manually.
          </p>
        )}
      </div>
    </div>
  );
}

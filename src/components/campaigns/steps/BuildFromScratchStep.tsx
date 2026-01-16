import { useState, useRef } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampaignFormData, BUSINESS_TYPES, ColumnConfig, TitlePattern } from "../types";
import { cn } from "@/lib/utils";

interface BuildFromScratchStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
}

export function BuildFromScratchStep({ formData, updateFormData }: BuildFromScratchStepProps) {
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [editingColumn, setEditingColumn] = useState<{ columnId: string; name: string } | null>(null);
  const [columnNames, setColumnNames] = useState<Record<string, string>>({});
  const [newPattern, setNewPattern] = useState("");
  const [newUrlPrefix, setNewUrlPrefix] = useState("");
  const patternInputRef = useRef<HTMLInputElement>(null);

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

    updateFormData({
      titlePatterns: [...(formData.titlePatterns || []), newTitlePattern],
    });
    setNewPattern("");
    setNewUrlPrefix("");
  };

  const removeTitlePattern = (patternId: string) => {
    updateFormData({
      titlePatterns: (formData.titlePatterns || []).filter((p) => p.id !== patternId),
    });
  };

  // Calculate estimated pages for a pattern
  const calculatePagesForPattern = (pattern: TitlePattern): number => {
    const patternLower = pattern.pattern.toLowerCase();
    const usedColumnIds = columns.filter(col => 
      patternLower.includes(`{{${col.id.toLowerCase()}}}`)
    ).map(col => col.id);

    if (usedColumnIds.length === 0) return 0;

    // Calculate product of all used columns
    return usedColumnIds.reduce((acc, colId) => {
      const items = formData.scratchData[colId] || [];
      return acc * (items.length || 1);
    }, 1);
  };

  // Calculate total pages across all patterns
  const totalEstimatedPages = (formData.titlePatterns || []).reduce(
    (acc, pattern) => acc + calculatePagesForPattern(pattern),
    0
  );

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Add Your Data</h2>
        <p className="text-muted-foreground">
          Enter your data in the columns below, then add title patterns to generate pages.
        </p>
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

      {/* Title Patterns Section */}
      <div className="border rounded-xl p-6 space-y-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Title Patterns</h3>
          <span className="text-sm text-primary font-medium">
            {totalEstimatedPages} pages will be created
          </span>
        </div>

        {/* Existing Patterns List */}
        {(formData.titlePatterns || []).length > 0 && (
          <div className="space-y-2">
            {(formData.titlePatterns || []).map((pattern) => {
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
            {columns.map((col) => (
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
                  const col = columns.find(c => c.id.toLowerCase() === key.toLowerCase());
                  return col ? `[${col.name}]` : `{{${key}}}`;
                })}
              </p>
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

import { useState } from "react";
import { Plus, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampaignFormData, BUSINESS_TYPES, ColumnConfig } from "../types";
import { cn } from "@/lib/utils";

interface BuildFromScratchStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
}

export function BuildFromScratchStep({ formData, updateFormData }: BuildFromScratchStepProps) {
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [editingColumn, setEditingColumn] = useState<{ columnId: string; name: string } | null>(null);
  const [columnNames, setColumnNames] = useState<Record<string, string>>({});

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

  const generateTitles = () => {
    const titles: { id: string; title: string; language: string }[] = [];
    const col1Items = formData.scratchData[columns[0]?.id] || [];
    const col2Items = formData.scratchData[columns[1]?.id] || [];
    const col3Items = formData.scratchData[columns[2]?.id] || [];

    // Generate combinations
    col1Items.forEach((item1) => {
      col2Items.forEach((item2) => {
        col3Items.forEach((item3) => {
          titles.push({
            id: `${item1}-${item2}-${item3}`,
            title: `${item1} in ${item2}`,
            language: item3,
          });
        });
      });
    });

    updateFormData({ generatedTitles: titles.slice(0, 10) }); // Limit for preview
  };

  const totalCombinations = columns.reduce((acc, col) => {
    const count = formData.scratchData[col.id]?.length || 0;
    return acc === 0 ? count : acc * (count || 1);
  }, 0);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Add Your Data</h2>
        <p className="text-muted-foreground">
          Enter your data in the columns below. We'll combine them to generate your campaign pages.
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

      {/* Generate Titles Button */}
      <Button onClick={generateTitles} className="bg-primary">
        <Wand2 className="h-4 w-4 mr-2" />
        Generate Titles
      </Button>

      {/* Generated Titles Preview */}
      {formData.generatedTitles.length > 0 && (
        <div className="border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Generated Titles</h3>
            <span className="text-sm text-primary">{totalCombinations} combinations generated</span>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr,auto] gap-4 p-3 bg-muted/50 text-sm font-medium">
              <span>Title</span>
              <span>Language</span>
            </div>
            {formData.generatedTitles.map((title, index) => (
              <div
                key={title.id}
                className={cn(
                  "grid grid-cols-[1fr,auto] gap-4 p-3 text-sm",
                  index !== formData.generatedTitles.length - 1 && "border-b"
                )}
              >
                <span>{title.title}</span>
                <span className="text-muted-foreground">{title.language}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Your final campaign will include all permutations.
          </p>
        </div>
      )}
    </div>
  );
}

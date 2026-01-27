import { useState, useEffect } from "react";
import { Plus, Check, X, Sparkles, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CampaignFormData, BUSINESS_TYPES, DynamicColumn } from "../types";
import { cn } from "@/lib/utils";

interface DatasetApprovalStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
}

interface DatasetItem {
  id: string;
  name: string;
  placeholder: string;
  isCustom: boolean;
}

// Sanitize variable name to only allow alphanumeric and underscore
const sanitizeVariableName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
};

export function DatasetApprovalStep({ formData, updateFormData }: DatasetApprovalStepProps) {
  // Get suggested datasets from business type
  const businessType = BUSINESS_TYPES.find(t => t.id === formData.businessType);
  const suggestedDatasets: DatasetItem[] = (businessType?.columns || []).map(col => ({
    id: col.id,
    name: col.name,
    placeholder: col.placeholder,
    isCustom: false,
  }));

  // Initialize approved datasets from formData or suggested
  const [datasets, setDatasets] = useState<DatasetItem[]>(() => {
    if (formData.dynamicColumns.length > 0) {
      // Already have datasets, use those
      return formData.dynamicColumns.map(col => ({
        id: col.variableName,
        name: col.displayName,
        placeholder: col.placeholder,
        isCustom: !suggestedDatasets.some(s => s.id === col.variableName),
      }));
    }
    return suggestedDatasets;
  });

  const [approvedIds, setApprovedIds] = useState<Set<string>>(() => {
    if (formData.dynamicColumns.length > 0) {
      return new Set(formData.dynamicColumns.map(c => c.variableName));
    }
    return new Set(suggestedDatasets.map(d => d.id));
  });

  const [newDatasetName, setNewDatasetName] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // Sync approved datasets to formData
  useEffect(() => {
    const approvedDatasets = datasets.filter(d => approvedIds.has(d.id));
    
    const dynamicColumns: DynamicColumn[] = approvedDatasets.map(ds => ({
      id: `col-${ds.id}-${Date.now()}`,
      variableName: sanitizeVariableName(ds.name),
      displayName: ds.name,
      placeholder: ds.placeholder || `Add ${ds.name}`,
    }));

    // Preserve existing scratchData for approved columns
    const scratchData: Record<string, string[]> = {};
    dynamicColumns.forEach(col => {
      // Try to find existing data by variableName
      const existingCol = formData.dynamicColumns.find(
        c => c.variableName === col.variableName
      );
      if (existingCol && formData.scratchData[existingCol.id]) {
        scratchData[col.id] = formData.scratchData[existingCol.id];
      } else {
        scratchData[col.id] = [];
      }
    });

    updateFormData({ dynamicColumns, scratchData });
  }, [approvedIds, datasets]);

  const toggleDataset = (datasetId: string) => {
    setApprovedIds(prev => {
      const next = new Set(prev);
      if (next.has(datasetId)) {
        next.delete(datasetId);
      } else {
        next.add(datasetId);
      }
      return next;
    });
  };

  const handleAddCustomDataset = () => {
    const name = newDatasetName.trim();
    if (!name) return;

    const id = sanitizeVariableName(name);
    
    // Check for duplicate
    if (datasets.some(d => d.id === id)) {
      return;
    }

    const newDataset: DatasetItem = {
      id,
      name,
      placeholder: `Add ${name}`,
      isCustom: true,
    };

    setDatasets(prev => [...prev, newDataset]);
    setApprovedIds(prev => new Set(prev).add(id));
    setNewDatasetName("");
    setIsAddingCustom(false);
  };

  const removeCustomDataset = (datasetId: string) => {
    setDatasets(prev => prev.filter(d => d.id !== datasetId));
    setApprovedIds(prev => {
      const next = new Set(prev);
      next.delete(datasetId);
      return next;
    });
  };

  const approvedCount = approvedIds.size;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Approve Your Datasets</h2>
        <p className="text-muted-foreground">
          Based on your business type, we recommend these datasets for your campaign.
          <br />
          Select which ones to include, or add custom datasets.
        </p>
      </div>

      {/* Business Type Badge */}
      {businessType && (
        <div className="flex items-center justify-center">
          <Badge variant="secondary" className="text-sm py-1 px-3">
            <Sparkles className="h-3 w-3 mr-1" />
            Suggested for {businessType.name}
          </Badge>
        </div>
      )}

      {/* Dataset List */}
      <div className="space-y-3">
        {datasets.map(dataset => (
          <label
            key={dataset.id}
            className={cn(
              "flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all",
              approvedIds.has(dataset.id)
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "hover:border-muted-foreground/50"
            )}
          >
            <Checkbox
              checked={approvedIds.has(dataset.id)}
              onCheckedChange={() => toggleDataset(dataset.id)}
              className="h-5 w-5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{dataset.name}</span>
                {dataset.isCustom && (
                  <Badge variant="outline" className="text-xs">Custom</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground block mt-0.5">
                Variable: <code className="bg-muted px-1 rounded">{`{{${sanitizeVariableName(dataset.name)}}}`}</code>
              </span>
            </div>
            {dataset.isCustom && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  removeCustomDataset(dataset.id);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {approvedIds.has(dataset.id) && !dataset.isCustom && (
              <Check className="h-5 w-5 text-primary flex-shrink-0" />
            )}
          </label>
        ))}
      </div>

      {/* Add Custom Dataset */}
      <div className="border-t pt-6">
        {isAddingCustom ? (
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Industries, Neighborhoods, Products..."
              value={newDatasetName}
              onChange={(e) => setNewDatasetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomDataset();
                }
                if (e.key === "Escape") {
                  setIsAddingCustom(false);
                  setNewDatasetName("");
                }
              }}
              autoFocus
            />
            <Button onClick={handleAddCustomDataset} disabled={!newDatasetName.trim()}>
              Add
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddingCustom(false);
                setNewDatasetName("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsAddingCustom(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Dataset
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{approvedCount}</span> dataset{approvedCount !== 1 ? 's' : ''} selected
        </p>
        {approvedCount === 0 && (
          <p className="text-xs text-destructive mt-1">
            Please select at least one dataset to continue
          </p>
        )}
      </div>
    </div>
  );
}

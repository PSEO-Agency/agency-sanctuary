
# Plan: Parallel Dataset Generation, Pre-Approval Step, and Terminology Alignment

## Problem Analysis

Based on my exploration, I identified these issues:

1. **Single Global `isGenerating` State**: In `BuildFromScratchStep.tsx`, there's only one `isGenerating` boolean that tracks AI generation for ALL columns. When generation starts for column 1, opening the autofill popover for column 2 shows the global "Generating..." state even though column 2 isn't generating anything.

2. **State Corruption on Popover Close**: When closing a popover while generation is running, `setAiColumnId(null)` and `setAiPrompt("")` are called in the `onOpenChange` handler, which can interfere with the active generation.

3. **No Dataset Pre-Approval**: Currently, when a user selects a business type, they're immediately taken to the dataset editor without first approving the suggested datasets/columns.

4. **Terminology**: Uses "Add Column" instead of "Add Dataset".

5. **Matrix Builder Misalignment**: The `MatrixBuilderTab` uses `columnConfigs` from `BUSINESS_TYPES` instead of the dynamic columns saved with the campaign.

---

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     PARALLEL GENERATION STATE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   OLD (Single State):                                               │
│   ┌────────────────────────────────────────────────────────────┐   │
│   │  isGenerating: boolean     (blocks ALL columns)            │   │
│   │  aiColumnId: string | null (only one popover open)         │   │
│   │  aiPrompt: string          (shared across all)             │   │
│   └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   NEW (Per-Column State):                                           │
│   ┌────────────────────────────────────────────────────────────┐   │
│   │  generatingColumns: Set<string>   // Track each column     │   │
│   │  aiPrompts: Record<string, string> // Per-column prompts   │   │
│   │  openPopoverId: string | null     // Which popover is open │   │
│   └────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    WIZARD FLOW WITH PRE-APPROVAL                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Step 1: Business Details                                          │
│     └─► User selects business type                                  │
│                                                                     │
│   Step 2: Data Upload Method                                        │
│     └─► User chooses "Build From Scratch"                           │
│                                                                     │
│   Step 3 (NEW): Dataset Approval                                    │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  "Based on your business type, we suggest these        │    │
│     │   datasets for your campaign:"                          │    │
│     │                                                         │    │
│     │   ☑ Services (e.g., Plumbing, HVAC)                    │    │
│     │   ☑ Cities (e.g., Amsterdam, Rotterdam)                │    │
│     │   ☑ Languages (e.g., English, Dutch)                   │    │
│     │   ☐ Add Custom Dataset...                              │    │
│     │                                                         │    │
│     │   [Approve & Continue]                                  │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                     │
│   Step 4: Dataset Editor (current BuildFromScratchStep)             │
│     └─► User populates approved datasets                            │
│                                                                     │
│   Step 5: Template Selection                                        │
│   Step 6: Template Editor                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Changes

### 1. BuildFromScratchStep.tsx - Parallel Generation State

**Problem**: Single `isGenerating` boolean blocks all columns.

**Solution**: Track generation state per-column using a Set.

| Current State | New State |
|--------------|-----------|
| `isGenerating: boolean` | `generatingColumns: Set<string>` |
| `aiColumnId: string \| null` | `openPopoverId: string \| null` |
| `aiPrompt: string` | `aiPrompts: Record<string, string>` |

**Key Changes**:

```typescript
// OLD
const [isGenerating, setIsGenerating] = useState(false);
const [aiColumnId, setAiColumnId] = useState<string | null>(null);
const [aiPrompt, setAiPrompt] = useState("");

// NEW
const [generatingColumns, setGeneratingColumns] = useState<Set<string>>(new Set());
const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
const [aiPrompts, setAiPrompts] = useState<Record<string, string>>({});

// Updated handleAIGenerate
const handleAIGenerate = async (columnId: string) => {
  const prompt = aiPrompts[columnId];
  if (!prompt?.trim()) return;
  
  // Add this column to generating set (don't block others)
  setGeneratingColumns(prev => new Set(prev).add(columnId));
  
  try {
    // ... API call
    // On success, remove from generating set
  } finally {
    setGeneratingColumns(prev => {
      const next = new Set(prev);
      next.delete(columnId);
      return next;
    });
    // Clear only this column's prompt
    setAiPrompts(prev => ({ ...prev, [columnId]: "" }));
  }
};
```

**UI Updates**:
- Each popover shows its own loading state: `generatingColumns.has(columnId)`
- Popover stays open during generation for its own column
- Opening another popover doesn't affect running generations

### 2. Terminology Change: "Add Column" → "Add Dataset"

**Files Affected**:
- `BuildFromScratchStep.tsx`: Button text on line 753
- `MatrixBuilderTab.tsx`: Any "column" references in UI

**Changes**:
```typescript
// BuildFromScratchStep.tsx line 753
<Plus className="h-4 w-4 mr-1" />
Add Dataset  // Changed from "Add Column"

// Header text updates
<h2 className="text-2xl font-bold">Build Your Datasets</h2>
<p className="text-muted-foreground">
  Enter items for each dataset below, then add title patterns to generate pages.
</p>
```

### 3. New Component: DatasetApprovalStep.tsx

**Purpose**: Insert a pre-approval step between choosing "Build From Scratch" and the dataset editor.

**Location**: `src/components/campaigns/steps/DatasetApprovalStep.tsx`

**Functionality**:
- Display suggested datasets based on selected business type
- Allow users to check/uncheck datasets
- Allow adding custom datasets before proceeding
- Store approved datasets in `formData.dynamicColumns`

```typescript
interface DatasetApprovalStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
}

export function DatasetApprovalStep({ formData, updateFormData }: DatasetApprovalStepProps) {
  // Get suggested columns from business type
  const businessType = BUSINESS_TYPES.find(t => t.id === formData.businessType);
  const suggestedColumns = businessType?.columns || [];
  
  // Track which columns are approved
  const [approvedIds, setApprovedIds] = useState<Set<string>>(
    new Set(suggestedColumns.map(c => c.id))
  );
  
  // Custom column input
  const [newDatasetName, setNewDatasetName] = useState("");
  
  // On mount or when approved changes, update formData
  useEffect(() => {
    const approvedColumns: DynamicColumn[] = suggestedColumns
      .filter(c => approvedIds.has(c.id))
      .map(col => ({
        id: `col-${col.id}-${Date.now()}`,
        variableName: col.id,
        displayName: col.name,
        placeholder: `Add ${col.name}`,
      }));
    
    // Initialize scratchData for approved columns
    const scratchData: Record<string, string[]> = {};
    approvedColumns.forEach(col => {
      scratchData[col.id] = formData.scratchData[col.id] || [];
    });
    
    updateFormData({ dynamicColumns: approvedColumns, scratchData });
  }, [approvedIds]);
  
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Approve Your Datasets</h2>
        <p className="text-muted-foreground">
          Based on your business type, we recommend these datasets.
          Select which ones to include in your campaign.
        </p>
      </div>
      
      {/* Suggested datasets with checkboxes */}
      <div className="space-y-3">
        {suggestedColumns.map(col => (
          <label key={col.id} className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:border-primary/50">
            <Checkbox 
              checked={approvedIds.has(col.id)}
              onCheckedChange={(checked) => {
                setApprovedIds(prev => {
                  const next = new Set(prev);
                  if (checked) next.add(col.id);
                  else next.delete(col.id);
                  return next;
                });
              }}
            />
            <div>
              <span className="font-medium">{col.name}</span>
              <span className="text-xs text-muted-foreground block">
                e.g., {col.placeholder}
              </span>
            </div>
          </label>
        ))}
      </div>
      
      {/* Add custom dataset */}
      <div className="border-t pt-4">
        <Label>Add Custom Dataset</Label>
        <div className="flex gap-2 mt-2">
          <Input 
            placeholder="e.g., Industries, Neighborhoods..."
            value={newDatasetName}
            onChange={(e) => setNewDatasetName(e.target.value)}
          />
          <Button onClick={handleAddCustomDataset}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 4. CreateCampaignDialog.tsx - Update Step Flow

**Current Flow** (5 steps):
1. Business Details
2. Data Upload Method
3. CSV Upload OR BuildFromScratch
4. Template Selection
5. Template Editor

**New Flow** (6 steps for "scratch" path):
1. Business Details
2. Data Upload Method
3. **Dataset Approval** (NEW - only for "scratch")
4. Dataset Editor (BuildFromScratch)
5. Template Selection
6. Template Editor

**Implementation**:
```typescript
const STEP_TITLES = [
  "Business Details",
  "Data Upload Method",
  "Dataset Approval",  // NEW
  "Build Your Datasets",
  "Template Selection",
  "Customize Template",
];

const totalSteps = formData.dataUploadMethod === "scratch" ? 6 : 5;

const renderStep = () => {
  switch (currentStep) {
    case 1: return <BusinessDetailsStep ... />;
    case 2: return <DataUploadMethodStep ... />;
    case 3:
      if (formData.dataUploadMethod === "csv") {
        return <CSVUploadStep ... />;
      }
      // For scratch: show approval step first
      return <DatasetApprovalStep ... />;
    case 4:
      if (formData.dataUploadMethod === "csv") {
        return <TemplateSelectionStep ... />;
      }
      return <BuildFromScratchStep ... />;
    case 5:
      if (formData.dataUploadMethod === "csv") {
        return <TemplateEditorStep ... />;
      }
      return <TemplateSelectionStep ... />;
    case 6:
      return <TemplateEditorStep ... />;
  }
};
```

### 5. MatrixBuilderTab.tsx - Align with Campaign Creation

**Problem**: Uses hardcoded `columnConfigs` from `BUSINESS_TYPES` instead of the campaign's saved `dynamicColumns`.

**Solution**: Read dynamic columns from `campaign.template_config` or `campaign.wizard_state`.

**Changes**:
```typescript
// OLD: Hardcoded from business type
const columnConfigs = businessType?.columns || BUSINESS_TYPES[2].columns;

// NEW: Use saved dynamic columns from campaign
const savedDynamicColumns = (campaign.template_config as any)?.dynamicColumns 
  || (campaign.wizard_state as any)?.dynamicColumns 
  || [];

// If none saved, fall back to business type defaults
const columnConfigs = savedDynamicColumns.length > 0 
  ? savedDynamicColumns.map((col: DynamicColumn) => ({
      id: col.variableName,
      name: col.displayName,
      placeholder: col.placeholder,
    }))
  : businessType?.columns || BUSINESS_TYPES[2].columns;
```

**Additional Alignment**:
- Add AI Autofill button (Sparkles icon) to each column in MatrixBuilderTab
- Share the same popover UI pattern as BuildFromScratchStep
- Use same per-column generation state approach

---

## Data Flow Summary

```text
Step 1: User selects "Local Business"
          │
          ▼
Step 2: User picks "Build From Scratch"
          │
          ▼
Step 3: DatasetApprovalStep shows:
        ☑ Services  ☑ Cities  ☑ Languages
        User can uncheck or add custom
          │
          ▼
        formData.dynamicColumns = [
          { id: "col-services-xxx", variableName: "services", displayName: "Services" },
          { id: "col-cities-xxx", variableName: "cities", displayName: "Cities" },
        ]
          │
          ▼
Step 4: BuildFromScratchStep shows approved columns
        User fills data with parallel AI generation support
          │
          ▼
        Data saved to campaign.template_config.dynamicColumns
          │
          ▼
Later:  MatrixBuilderTab reads campaign.template_config.dynamicColumns
        Shows same columns user approved, with AI autofill
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/campaigns/steps/BuildFromScratchStep.tsx` | Modify | Per-column generation state, "Add Dataset" terminology |
| `src/components/campaigns/steps/DatasetApprovalStep.tsx` | Create | New pre-approval step component |
| `src/components/campaigns/CreateCampaignDialog.tsx` | Modify | Insert approval step, update step count logic |
| `src/components/campaigns/detail/tabs/MatrixBuilderTab.tsx` | Modify | Read dynamic columns from campaign config, add AI autofill |
| `src/hooks/useCampaigns.ts` | Modify | Save dynamicColumns to template_config on finalize |

---

## Technical Details

### Parallel Generation State Interface

```typescript
interface ColumnGenerationState {
  generatingColumns: Set<string>;  // Column IDs currently generating
  aiPrompts: Record<string, string>;  // Per-column prompts
  openPopoverId: string | null;  // Which popover is currently open
}
```

### Popover Behavior

- Opening a popover sets `openPopoverId` to that column's ID
- Closing a popover only clears `openPopoverId`, does NOT interrupt generation
- Each popover's Generate button checks `generatingColumns.has(columnId)` for its own state
- Multiple columns can generate simultaneously

### Template Config Structure Update

```typescript
// Saved to campaign.template_config
{
  dynamicColumns: DynamicColumn[],  // Approved and customized columns
  entities: Entity[],
  titlePatterns: TitlePattern[],
  // ... other template config
}
```

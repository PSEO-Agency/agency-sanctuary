

# Campaign Onboarding Improvements Plan

## Overview

This plan addresses two key issues in the pSEO Builder campaign onboarding flow:

1. **Dynamic Dataset Variables**: Column names are only stored locally and don't propagate to variables
2. **Full-Page Template Editor**: The page builder at step 5 should take the full screen (not just a dialog)

---

## Problem Analysis

### Issue 1: Non-Dynamic Dataset Variables

**Current Behavior:**
- Column configurations come from static `BUSINESS_TYPES` (e.g., `{ id: "services", name: "Services", ... }`)
- When a user renames a column header (e.g., "Services" → "Industries"), it only updates local state `columnNames` in `BuildFromScratchStep`
- The variable buttons still show `{{services}}` because they use the static `col.id`
- Data is stored in `formData.scratchData` using the static ID as the key
- Title patterns contain hardcoded IDs like `{{services}}`

**Root Cause:**
- `columnNames` is local component state, not persisted to `formData`
- Variables are derived from immutable `col.id`, not user-defined names
- No mechanism to propagate column renames throughout the system

### Issue 2: Template Editor Not Full Page

**Current Behavior:**
- Step 5 uses `DialogContent` with `max-w-[95vw] h-[90vh]` — still a dialog, not truly full-page
- The dialog header/footer are hidden but the dialog container remains

---

## Proposed Solution

### Solution 1: Dynamic Column Configuration

**Approach:** Store a mutable `columns` configuration in `formData` that tracks both the variable ID (key) and display name. When a user renames a column, update the variable ID everywhere.

**Changes Required:**

#### 1.1 Update Types (`src/components/campaigns/types.ts`)

Add a new field to track dynamic columns with their user-defined names:

```typescript
export interface DynamicColumn {
  id: string;           // Generated unique ID (stable reference)
  variableName: string; // User-editable variable name (e.g., "industries")
  displayName: string;  // User-editable display name
  placeholder: string;  // Placeholder text
}

export interface CampaignFormData {
  // ... existing fields
  
  // Step 3B: Build From Scratch
  dynamicColumns: DynamicColumn[];  // NEW: Replaces static column config
  scratchData: Record<string, string[]>;  // Keyed by column.id (not variableName)
  titlePatterns: TitlePattern[];
}
```

#### 1.2 Update Initial Form Data

Add `dynamicColumns: []` to `initialFormData` and populate it when a business type is selected.

#### 1.3 Update BuildFromScratchStep

**Key Changes:**
1. Initialize `dynamicColumns` from business type when entering step 3
2. Store column renames directly in `formData.dynamicColumns`
3. Update variable buttons to show `{{column.variableName}}`
4. When renaming a variable, update all existing title patterns that reference it
5. Store data in `scratchData` using `column.id` (stable) but display using `variableName`

**Rename Propagation Logic:**
```typescript
const handleColumnRename = (columnId: string, newVariableName: string) => {
  const oldColumn = formData.dynamicColumns.find(c => c.id === columnId);
  if (!oldColumn) return;
  
  const oldVar = `{{${oldColumn.variableName}}}`;
  const newVar = `{{${newVariableName}}}`;
  
  // Update column configuration
  const updatedColumns = formData.dynamicColumns.map(col =>
    col.id === columnId ? { ...col, variableName: newVariableName } : col
  );
  
  // Update all title patterns that reference this variable
  const updatedPatterns = formData.titlePatterns.map(pattern => ({
    ...pattern,
    pattern: pattern.pattern.replace(new RegExp(oldVar, 'gi'), newVar)
  }));
  
  updateFormData({
    dynamicColumns: updatedColumns,
    titlePatterns: updatedPatterns,
  });
};
```

#### 1.4 Update useCampaigns Hook

Store `dynamicColumns` alongside `data_columns` in the campaign record to preserve the variable mappings:

```typescript
// In createCampaign:
column_mappings: {
  columns: formData.dynamicColumns,
  ...formData.columnMappings,
},
```

#### 1.5 Starter Datasets

Ensure each business type initializes with proper starter columns:

| Business Type | Starter Columns |
|--------------|-----------------|
| SaaS | features, useCases, integrations |
| Ecommerce | products, categories, locations |
| Local Business | services, cities, languages |

---

### Solution 2: Full-Page Template Editor

**Approach:** Instead of using a dialog, render the template editor as a full-screen overlay when on step 5.

**Changes Required:**

#### 2.1 Update CreateCampaignDialog

For step 5, instead of rendering inside `DialogContent`, render a full-screen portal:

```typescript
// When step 5 is active:
if (currentStep === 5) {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <TemplateEditorStep
        formData={formData}
        updateFormData={updateFormData}
        onBack={() => setCurrentStep(4)}
        onFinish={() => {
          onComplete(formData);
          handleClose();
        }}
      />
    </div>
  );
}

// Otherwise, keep the dialog:
return (
  <Dialog open={open} onOpenChange={handleClose}>
    <DialogContent className="max-w-4xl max-h-[90vh]">
      {/* Steps 1-4 */}
    </DialogContent>
  </Dialog>
);
```

#### 2.2 Update TemplateEditorStep

Add an `onFinish` prop and include a "Finish" button in the header:

```typescript
interface TemplateEditorStepProps {
  // ... existing props
  onFinish?: () => void;  // NEW
}

// In the component:
<UnifiedPageBuilder
  // ... existing props
  headerContent={
    <Button onClick={onFinish} className="ml-auto">
      Finish Campaign
    </Button>
  }
/>
```

---

## File Changes Summary

| File | Type | Description |
|------|------|-------------|
| `src/components/campaigns/types.ts` | Modify | Add `DynamicColumn` interface, update `CampaignFormData` |
| `src/components/campaigns/steps/BuildFromScratchStep.tsx` | Modify | Use dynamic columns, handle renames with propagation |
| `src/components/campaigns/CreateCampaignDialog.tsx` | Modify | Full-screen portal for step 5 |
| `src/components/campaigns/steps/TemplateEditorStep.tsx` | Modify | Add `onFinish` prop, include finish button |
| `src/hooks/useCampaigns.ts` | Modify | Store `dynamicColumns` in campaign record |

---

## Data Flow Diagram

```text
                 Business Type Selected
                         │
                         ▼
            ┌────────────────────────────┐
            │  Initialize dynamicColumns │
            │  from BUSINESS_TYPES       │
            └────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────────┐
            │  User edits column name    │
            │  "Services" → "Industries" │
            └────────────────────────────┘
                         │
                         ▼
        ┌────────────────┴────────────────┐
        ▼                                 ▼
┌───────────────────┐          ┌───────────────────┐
│ Update column's   │          │ Update all title  │
│ variableName      │          │ patterns: replace │
│ in dynamicColumns │          │ {{services}} with │
│                   │          │ {{industries}}    │
└───────────────────┘          └───────────────────┘
        │                                 │
        └────────────────┬────────────────┘
                         ▼
            ┌────────────────────────────┐
            │  Variable buttons now show │
            │  {{industries}} everywhere │
            └────────────────────────────┘
```

---

## Edge Cases

1. **Duplicate Variable Names**: Validate that new variable names are unique across all columns
2. **Invalid Characters**: Sanitize variable names to only allow alphanumeric and underscore
3. **Empty Patterns**: When updating patterns, skip those that don't contain the old variable
4. **Template Content**: If template content references variables, those should also be updated (future enhancement)

---

## Testing Checklist

- [ ] Create campaign with "Local Business" type
- [ ] Rename "Services" column to "Industries"
- [ ] Verify variable buttons update to `{{industries}}`
- [ ] Add a title pattern with `{{industries}}`
- [ ] Rename column again to "Offerings"
- [ ] Verify existing patterns update from `{{industries}}` to `{{offerings}}`
- [ ] Verify step 5 renders as full-page overlay
- [ ] Verify "Back to Templates" returns to step 4
- [ ] Verify "Finish Campaign" creates the campaign correctly


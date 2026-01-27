

# Fix Dynamic Column Variables & Add New Column Feature

## Problems Identified

1. **"Add [X]" Button Uses Static Placeholder**
   - Line 392 uses `col.placeholder` which comes from the initial `BUSINESS_TYPES` config
   - When a user renames "Locations" to "Industries", the button still says "Add Location"

2. **No "Add Column" Feature**
   - Users can only work with the 3 default columns per business type
   - No way to add additional columns dynamically

3. **Redundant Variable Name Input**
   - Users currently must edit both Display Name and Variable Name separately
   - Request: Variable name should auto-derive from display name

---

## Solution

### Fix 1: Dynamic Button Text

Change line 391-392 from:
```tsx
<Plus className="h-4 w-4 mr-1" />
{col.placeholder}
```

To:
```tsx
<Plus className="h-4 w-4 mr-1" />
Add {col.displayName}
```

This ensures the button always reflects the current column name.

### Fix 2: Auto-Derive Variable Name

When a user edits a column name:
- **Remove** the separate variable name input field
- **Auto-generate** the variable name from the display name using:
  - Lowercase
  - Replace spaces with underscores
  - Remove special characters

**Before (Lines 293-332):**
```tsx
{editingColumn?.columnId === col.id ? (
  <div className="flex-1 space-y-2">
    <Input value={editingColumn.displayName} ... />
    <div className="flex items-center gap-1">
      <Input value={editingColumn.variableName} ... />  // REMOVE THIS
    </div>
    <Button onClick={() => handleColumnRename(...)} />
  </div>
)}
```

**After:**
```tsx
{editingColumn?.columnId === col.id ? (
  <div className="flex-1 space-y-2">
    <Input value={editingColumn.displayName} ... />
    <p className="text-xs text-muted-foreground font-mono">
      → Variable: {`{{${sanitizeVariableName(editingColumn.displayName)}}}`}
    </p>
    <Button onClick={() => handleColumnRename(col.id, editingColumn.displayName, editingColumn.displayName)} />
  </div>
)}
```

The `sanitizeVariableName` function already exists (lines 23-28) and does exactly what's needed.

### Fix 3: Add "New Column" Button

Add a new card at the end of the columns grid with a "+" button:

```tsx
{/* Add New Column Card */}
<div className="border rounded-xl p-4 flex items-center justify-center min-h-[200px] border-dashed hover:border-primary transition-colors cursor-pointer">
  <Button variant="ghost" onClick={handleAddColumn}>
    <Plus className="h-5 w-5 mr-2" />
    Add Column
  </Button>
</div>
```

**New handler:**
```typescript
const handleAddColumn = () => {
  const newColId = `col-custom-${Date.now()}`;
  const newColumn: DynamicColumn = {
    id: newColId,
    variableName: `column_${formData.dynamicColumns.length + 1}`,
    displayName: `Column ${formData.dynamicColumns.length + 1}`,
    placeholder: `Add Item`,
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
```

### Fix 4: Update Placeholder in DynamicColumn

When saving a column rename, also update the placeholder dynamically:

```typescript
const handleColumnRename = (columnId: string, newDisplayName: string) => {
  const sanitizedVarName = sanitizeVariableName(newDisplayName);
  // ... existing duplicate check logic ...
  
  const updatedColumns = formData.dynamicColumns.map(col =>
    col.id === columnId 
      ? { 
          ...col, 
          displayName: newDisplayName, 
          variableName: sanitizedVarName,
          placeholder: `Add ${newDisplayName}`,  // NEW: Update placeholder too
        } 
      : col
  );
  // ... rest of the function ...
};
```

---

## File Changes

| File | Changes |
|------|---------|
| `src/components/campaigns/steps/BuildFromScratchStep.tsx` | - Line 392: Change `{col.placeholder}` to `Add {col.displayName}` |
| | - Lines 302-311: Remove variable name input, show auto-generated preview |
| | - Lines 316-318: Simplify save to derive variable from display name |
| | - Add `handleAddColumn` function after line 150 |
| | - Line 396-397: Add new column card after the map |
| | - Line 104: Update placeholder in `handleColumnRename` |

---

## Updated Flow

```
User adds column:
┌─────────────────────────────────┐
│ 1. Clicks "+ Add Column"        │
│ 2. New card appears in grid     │
│ 3. Edit mode auto-opens         │
│ 4. User types "Industries"      │
│ 5. Preview shows: {{industries}}│
│ 6. User clicks Save             │
│ 7. Button shows: "Add Industries│
└─────────────────────────────────┘

User renames column:
┌─────────────────────────────────┐
│ 1. Clicks "Cities" header       │
│ 2. Types "Neighborhoods"        │
│ 3. Preview: {{neighborhoods}}   │
│ 4. Click Save                   │
│ 5. All patterns update:         │
│    {{cities}} → {{neighborhoods}}│
│ 6. Button: "Add Neighborhoods"  │
└─────────────────────────────────┘
```

---

## Edge Cases Handled

1. **Duplicate variable names**: Existing logic adds suffix (e.g., `industries2`)
2. **Empty display name**: Validate before save, don't allow empty
3. **Special characters**: `sanitizeVariableName` removes them
4. **Existing patterns**: Already propagate via regex replacement


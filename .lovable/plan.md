
# Plan: Fix AI Template Generator Entity Loop Bug

## Problem Identified
The dialog keeps looping back to the first template because:

1. When user clicks "Approve & Next", the `handleApprove` function:
   - Updates `currentEntityIndex` to move to next entity (index 1)
   - Calls `updateFormData({ entityTemplates: ... })` to save the template

2. This `updateFormData` call triggers the `useEffect` hook (line 105-146) because `formData.entityTemplates` is in its dependency array

3. The `useEffect` then recalculates which entity to show:
   - Both entities already have templates saved in `entityTemplates`
   - `firstIncompleteIndex` returns `-1` (no entity without template)
   - Falls back to `targetIndex = 0`
   - Resets `currentEntityIndex` back to 0

4. User sees the first template again, creating an infinite loop

## Solution

The fix is to prevent the `useEffect` from resetting the entity index after the initial dialog open. We should only run the initialization logic **once** when the dialog first opens, not on every `entityTemplates` change.

### File: `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx`

#### Change 1: Add an initialization flag
Add a `useRef` to track whether we've already initialized the dialog state:

```typescript
const hasInitialized = useRef(false);
```

#### Change 2: Modify the useEffect to only run initialization once
Update the effect to check the flag and skip re-initialization:

```typescript
useEffect(() => {
  if (open && !hasInitialized.current) {
    hasInitialized.current = true;
    
    // ... existing initialization logic ...
  }
  
  // Reset the flag when dialog closes
  if (!open) {
    hasInitialized.current = false;
  }
}, [open]); // Remove formData dependencies from array
```

#### Change 3: Separate the template restoration from index calculation
Create a separate effect to keep templates in sync without resetting the index:

```typescript
// Keep generatedTemplates in sync with formData (without resetting index)
useEffect(() => {
  if (!open) return;
  
  const existingTemplates: Record<string, GeneratedTemplate> = {};
  Object.entries(formData.entityTemplates || {}).forEach(([entityId, template]) => {
    existingTemplates[entityId] = {
      sections: template.sections as GeneratedSection[],
      style: template.style || { /* defaults */ },
      images: template.images || { sectionImages: [] },
    };
  });
  setGeneratedTemplates(existingTemplates);
}, [open, formData.entityTemplates]);
```

## Technical Details

The key insight is separating two concerns:
1. **Initialization** (which entity to start with) - should only happen once when dialog opens
2. **Data sync** (keeping templates updated) - can happen on formData changes

By using a ref to track initialization status, we prevent the entity index from being reset every time the template data changes.

## Testing
After this fix:
1. User clicks "Approve & Next" on first template
2. Index increments to 1
3. `updateFormData` triggers, but initialization is skipped (already initialized)
4. User correctly sees the second entity's template
5. Dialog only resets when it closes and reopens

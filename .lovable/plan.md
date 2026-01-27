
# Page Builder Refinement Plan

## Issues Identified

Based on code analysis, I've found the following problems:

### 1. Top Bar Weird Margin
**Location:** `CreateCampaignDialog.tsx` (line 134-138) and `TemplateEditorStep.tsx`

The full-screen portal renders with `fixed inset-0 z-50`, but `TemplateEditorStep` adds an Entity Progress Bar with padding (`px-4 py-3`) that creates extra top spacing. The `UnifiedPageBuilder` toolbar also has `px-4 py-3` padding which adds more vertical space.

### 2. Side Panels Expanded by Default
**Location:** `UnifiedPageBuilder.tsx` (lines 74-75 and 84-85)

```tsx
defaultBlocksPanelOpen = true,
defaultSettingsPanelOpen = true,
```

Both panels initialize as `true` by default, and `TemplateEditorStep` doesn't override these defaults.

### 3. No Drag-and-Drop for Sections
**Location:** `BlocksPanel.tsx` (lines 79-94)

The "Page Sections" list shows a `GripVertical` icon but has no drag-and-drop handlers. Sections cannot be reordered.

### 4. Entity Editing Clarity Issues
**Location:** `TemplateEditorStep.tsx` (lines 251-258)

The current entity indicator is buried in the header content as a small text label. When there are no entities defined in the previous step, the UI doesn't communicate this clearly.

### 5. Additional Issues Discovered
- No delete section functionality
- No visual indicator when no entities exist
- Entity Progress Bar adds extra visual noise when there's only one entity
- Missing "Finish Campaign" button prominence

---

## Solution Overview

| Issue | Fix |
|-------|-----|
| Top margin | Remove padding from portal wrapper, make toolbar flush |
| Side panels | Set `defaultBlocksPanelOpen={false}` and `defaultSettingsPanelOpen={false}` in TemplateEditorStep |
| Drag-and-drop | Add native HTML5 drag-and-drop to BlocksPanel section list |
| Entity clarity | Add prominent header banner showing current entity, hide progress bar if single entity |
| Section delete | Add delete button to section list items |

---

## Detailed Changes

### 1. Fix Top Margin (CreateCampaignDialog.tsx)

Remove any wrapper padding to ensure the builder fills the entire viewport:

```tsx
// Line 133-138: Keep portal but ensure no extra spacing
if (open && currentStep === 5) {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      {renderStep()}
    </div>
  );
}
```

The issue is actually in `TemplateEditorStep.tsx` - the Entity Progress Bar container adds padding even when it should be flush.

### 2. Collapse Panels by Default (TemplateEditorStep.tsx)

Update the `UnifiedPageBuilder` call:

```tsx
<UnifiedPageBuilder
  mode="template"
  sections={templateSections}
  // ...existing props...
  defaultBlocksPanelOpen={false}   // NEW: Start collapsed
  defaultSettingsPanelOpen={false}  // NEW: Start collapsed
  // ...
/>
```

### 3. Add Drag-and-Drop to BlocksPanel (BlocksPanel.tsx)

Add state and handlers for reordering:

```tsx
interface BlocksPanelProps {
  // ...existing props...
  onReorderSections?: (sections: TemplateSection[]) => void;  // NEW
}

// Inside component:
const [draggedSection, setDraggedSection] = useState<string | null>(null);
const [dragOverSection, setDragOverSection] = useState<string | null>(null);

const handleDragStart = (e: React.DragEvent, sectionId: string) => {
  setDraggedSection(sectionId);
  e.dataTransfer.effectAllowed = "move";
};

const handleDragOver = (e: React.DragEvent, sectionId: string) => {
  e.preventDefault();
  if (sectionId !== draggedSection) {
    setDragOverSection(sectionId);
  }
};

const handleDrop = (e: React.DragEvent, targetId: string) => {
  e.preventDefault();
  if (!draggedSection || draggedSection === targetId) return;
  
  const reordered = [...sections];
  const fromIndex = reordered.findIndex(s => s.id === draggedSection);
  const toIndex = reordered.findIndex(s => s.id === targetId);
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  
  onReorderSections?.(reordered);
  setDraggedSection(null);
  setDragOverSection(null);
};
```

Update section buttons:

```tsx
<button
  key={section.id}
  draggable
  onDragStart={(e) => handleDragStart(e, section.id)}
  onDragOver={(e) => handleDragOver(e, section.id)}
  onDrop={(e) => handleDrop(e, section.id)}
  onDragEnd={() => { setDraggedSection(null); setDragOverSection(null); }}
  className={cn(
    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
    selectedSection === section.id && "bg-primary/10 text-primary border border-primary/20",
    draggedSection === section.id && "opacity-50",
    dragOverSection === section.id && "ring-2 ring-primary ring-offset-1"
  )}
>
  <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab active:cursor-grabbing" />
  <span className="flex-1 truncate">{section.name}</span>
  <button onClick={(e) => { e.stopPropagation(); onDeleteSection?.(section.id); }}>
    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
  </button>
</button>
```

### 4. Entity Editing Clarity (TemplateEditorStep.tsx)

Redesign the entity indicator:

```tsx
{/* Entity Progress Bar - Only show if more than one entity */}
{entities.length > 1 && (
  <div className="border-b bg-muted/30 px-4 py-3">
    {/* ...existing EntitySelector... */}
  </div>
)}

{/* Current Entity Banner - Always show if entities exist */}
{entities.length > 0 && selectedEntity && (
  <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-3">
    <Tags className="h-4 w-4 text-primary" />
    <span className="text-sm">
      Editing template for: 
      <span className="font-semibold ml-1">{selectedEntity.name}</span>
    </span>
    <span className="text-xs text-muted-foreground font-mono">
      ({selectedEntity.urlPrefix})
    </span>
    {entities.length > 1 && (
      <Badge variant="outline" className="ml-auto">
        {completedEntities.length + 1}/{entities.length}
      </Badge>
    )}
  </div>
)}

{/* No Entities Warning */}
{entities.length === 0 && (
  <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2">
    <AlertTriangle className="h-4 w-4 text-yellow-600" />
    <span className="text-sm text-yellow-700">
      No entities defined. This template will apply to all pages.
    </span>
  </div>
)}
```

### 5. Wire Up Section Reordering (UnifiedPageBuilder.tsx)

Pass the reorder handler to BlocksPanel:

```tsx
<BlocksPanel
  isOpen={blocksPanelOpen}
  onToggle={() => setBlocksPanelOpen(!blocksPanelOpen)}
  onAddBlock={handleAddBlock}
  sections={sections}
  onSelectSection={handleSectionSelect}
  selectedSection={selectedSection}
  onReorderSections={onSectionsChange}  // NEW
  onDeleteSection={(sectionId) => {     // NEW
    const updated = sections.filter(s => s.id !== sectionId);
    onSectionsChange?.(updated);
  }}
/>
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/components/campaigns/steps/TemplateEditorStep.tsx` | Add `defaultBlocksPanelOpen={false}`, `defaultSettingsPanelOpen={false}`, redesign entity indicator, add no-entity warning |
| `src/components/page-builder/BlocksPanel.tsx` | Add drag-and-drop reordering, add delete section button, new props `onReorderSections` and `onDeleteSection` |
| `src/components/page-builder/UnifiedPageBuilder.tsx` | Pass reorder and delete handlers to BlocksPanel |

---

## Visual Before/After

**Before:**
```
┌──────────────────────────────────────────────────────────────────┐
│ [Entity Progress Bar with padding - 3/3 configured]              │ ← Extra spacing
├──────────────────────────────────────────────────────────────────┤
│ [← Back] [Toolbar]                        [Desktop][Tab][Mob]    │ ← More padding
├───────────────────┬─────────────────────────┬────────────────────┤
│ [BLOCKS - OPEN]   │                         │ [SETTINGS - OPEN]  │
│ Page Sections     │                         │ Content | Style    │
│ - Hero            │    Preview Canvas       │ ...lots of...      │
│ - Features        │                         │ ...settings...     │
│ - Content         │                         │                    │
│ ...               │                         │                    │
└───────────────────┴─────────────────────────┴────────────────────┘
```

**After:**
```
┌──────────────────────────────────────────────────────────────────┐ ← Flush to top
│ [← Back]  🏷 Editing: Services (/services/)    [🖥][📱][📲] [Finish] │
├────┬────────────────────────────────────────────────────────┬────┤
│ ▶  │                                                        │ ◀  │ ← Panels collapsed
│    │                                                        │    │
│    │                                                        │    │
│    │              Preview Canvas (maximized)                │    │
│    │                                                        │    │
│    │                                                        │    │
│    │                                                        │    │
└────┴────────────────────────────────────────────────────────┴────┘
     ↑ Click to expand Blocks                      Click to expand Settings ↑
```

---

## New Imports Required

**BlocksPanel.tsx:**
```tsx
import { Trash2 } from "lucide-react";
```

**TemplateEditorStep.tsx:**
```tsx
import { AlertTriangle, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
```



# UI Refinement: Column Section Scrolling & Variable Display

## Problems Identified

1. **Entire layout scrolls horizontally** - The columns container at line 500 has `overflow-x-auto` but this affects the whole section since there's no width constraint
2. **Variable `{{name}}` in column header is too long** - At line 606-608, the variable badge is inline with the column name, making the header overflow:
   ```tsx
   <span>{col.displayName}</span>
   <span className="text-xs text-muted-foreground font-mono ml-1">
     {`{{${col.variableName}}}`}
   </span>
   ```
3. **Header area feels cramped** - The title + variable + action buttons (AI, delete, collapse) are all in one horizontal row

---

## Solution

### Fix 1: Isolate Column Scrolling

Wrap the columns container in a container with explicit width constraints and only make the inner columns area scrollable:

```tsx
{/* Columns Section - Contained Scroll Area */}
<div className="w-full">
  <div className="flex flex-row gap-4 overflow-x-auto pb-4 scrollbar-thin">
    {/* ... columns ... */}
  </div>
</div>
```

The key is ensuring the parent layout elements don't cause the scroll to extend beyond the columns.

### Fix 2: Restructure Column Header

Move the variable badge to a separate row below the column name, making it a subtle secondary label:

**Before (cramped single row):**
```
┌─────────────────────────────────────┐
│ ⋮ Services {{services}}  ✨ 🗑 ◀   │
└─────────────────────────────────────┘
```

**After (clean multi-row):**
```
┌─────────────────────────────────────┐
│ ⋮ Services               ✨ 🗑 ◀   │
│   {{services}}                      │
└─────────────────────────────────────┘
```

**Code change (lines 596-610):**
```tsx
) : (
  <div className="flex-1 min-w-0">
    <button
      onClick={() => setEditingColumn({ ... })}
      className="font-semibold hover:text-primary transition-colors text-left truncate block w-full"
    >
      {col.displayName}
    </button>
    <span className="text-[10px] text-muted-foreground font-mono block truncate">
      {`{{${col.variableName}}}`}
    </span>
  </div>
)}
```

### Fix 3: Reduce Action Button Cluster Width

Make the action buttons more compact:
- Smaller icon size (3.5 instead of 4)
- Tighter spacing with `gap-0`

```tsx
<div className="flex items-center gap-0">
  <Button variant="ghost" size="icon" className="h-6 w-6">
    <Sparkles className="h-3.5 w-3.5" />
  </Button>
  {/* ... */}
</div>
```

### Fix 4: Add Custom Scrollbar Styling

Add a subtle scrollbar to indicate horizontal scrollability:

```tsx
<div className="flex flex-row gap-3 overflow-x-auto pb-3 -mx-2 px-2"
     style={{ scrollbarWidth: 'thin' }}>
```

---

## File Changes

| File | Change |
|------|--------|
| `src/components/campaigns/steps/BuildFromScratchStep.tsx` | Refactor column header layout, move variable to second row, reduce column width from `w-72` to `w-64`, improve scroll container |

---

## Detailed Code Changes

### 1. Column Container (Line 500)
```tsx
{/* Before */}
<div className="flex flex-row gap-4 overflow-x-auto pb-4">

{/* After */}
<div className="relative">
  <div className="flex flex-row gap-3 overflow-x-auto pb-3" style={{ scrollbarWidth: 'thin' }}>
```

### 2. Column Card Width (Line 544)
```tsx
{/* Before */}
className="flex-shrink-0 w-72 border rounded-xl p-4 space-y-4"

{/* After */}
className="flex-shrink-0 w-64 border rounded-xl p-4 space-y-3"
```

### 3. Column Header Structure (Lines 596-610)
Replace the single-line header with a stacked layout:

```tsx
) : (
  <div className="flex-1 min-w-0">
    <button
      onClick={() => setEditingColumn({ 
        columnId: col.id, 
        displayName: col.displayName,
        variableName: col.variableName 
      })}
      className="font-semibold hover:text-primary transition-colors text-left truncate block text-sm"
    >
      {col.displayName}
    </button>
    <span className="text-[10px] text-muted-foreground/70 font-mono truncate block">
      {`{{${col.variableName}}}`}
    </span>
  </div>
)}
```

### 4. Action Buttons (Lines 612-691)
Make them more compact:

```tsx
<div className="flex items-center gap-0 flex-shrink-0">
  {/* AI Magic Wand */}
  <Button variant="ghost" size="icon" className="h-5 w-5">
    <Sparkles className="h-3 w-3 text-primary" />
  </Button>
  
  {/* Delete Column */}
  <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive">
    <Trash2 className="h-3 w-3" />
  </Button>

  {/* Collapse Column */}
  <Button variant="ghost" size="icon" className="h-5 w-5">
    <ChevronLeft className="h-3 w-3" />
  </Button>
</div>
```

### 5. Add Column Card (Lines 743-752)
Make it narrower to match:

```tsx
<div className="flex-shrink-0 w-40 border rounded-xl ..."
```

---

## Visual Before/After

**Before:**
```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ⋮ Services {{services}} ✨🗑◀ │ ⋮ Cities {{cities}} ✨🗑◀ │ ⋮ Industries... │
│   0/100 items                  │   0/100 items              │   0/100 items    │
│   ┌─────────────────────┐      │   ┌───────────────────┐    │                  │
│   │ Item 1              │      │   │ Item 1            │    │                  │
│   └─────────────────────┘      │   └───────────────────┘    │                  │
│   [        Add Services      ] │   [     Add Cities       ] │                  │
└────────────────────────────────────────────────────────────────────────────────┘
                           ←── Scrolls entire page ──→
```

**After:**
```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Data Columns                                                                   │
├────────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌─────────┐ │
│ │ ⋮ Services  ✨🗑◀ │ │ ⋮ Cities    ✨🗑◀ │ │ ⋮ Industries✨🗑◀ │ │  + Add  │ │
│ │ {{services}}      │ │ {{cities}}        │ │ {{industries}}    │ │  Column │ │
│ │ 5/100 items       │ │ 3/100 items       │ │ 2/100 items       │ │         │ │
│ │ ┌───────────────┐ │ │ ┌───────────────┐ │ │ ┌───────────────┐ │ │         │ │
│ │ │ Plumbing      │ │ │ │ New York      │ │ │ │ Tech          │ │ │         │ │
│ │ │ Electrical    │ │ │ │ LA            │ │ │ │ Healthcare    │ │ │         │ │
│ │ │ HVAC          │ │ │ │ Chicago       │ │ │ └───────────────┘ │ │         │ │
│ │ └───────────────┘ │ │ └───────────────┘ │ │                   │ │         │ │
│ │ [  Add Services ] │ │ [   Add Cities  ] │ │ [ Add Industries] │ │         │ │
│ └───────────────────┘ └───────────────────┘ └───────────────────┘ └─────────┘ │
│                    ←─── Only this row scrolls horizontally ───→              │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

1. Variable moves to a separate line below the column name
2. Column width reduced from 72 to 64 for better fit
3. Action buttons made smaller (h-5/w-5 with h-3/w-3 icons)
4. Scroll container properly contained to just the columns row
5. "Add Column" card made narrower (w-40)


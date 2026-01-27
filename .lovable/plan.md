

# Enhanced Column Management - Horizontal Layout, Reordering, Collapsing, Deleting & AI Autofill

## Overview

This plan transforms the column management from a vertical grid layout to a horizontal, side-by-side layout with advanced features including drag-and-drop reordering, collapsible columns with rotated vertical titles, column deletion with confirmation, and AI-powered autofill functionality.

---

## Current State vs. Desired State

| Feature | Current | Desired |
|---------|---------|---------|
| **Layout** | Vertical grid (`grid-cols-3`) | Horizontal side-by-side (`flex-row`) |
| **Reordering** | Not available | Drag-and-drop reordering |
| **Collapsing** | Not available | Click to collapse with vertical rotated title |
| **Deleting** | Not available | Delete with confirmation dialog and pattern cleanup |
| **AI Autofill** | Not available | Magic wand button to generate column items |

---

## Technical Approach

### 1. Horizontal Side-by-Side Layout

**Change:** Replace `grid grid-cols-1 md:grid-cols-3` with `flex flex-row overflow-x-auto`

```tsx
{/* Before */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

{/* After */}
<div className="flex flex-row gap-4 overflow-x-auto pb-4">
  {columns.map((col, index) => (
    <div 
      key={col.id} 
      className="flex-shrink-0 w-72 border rounded-xl"
    >
      {/* Column content */}
    </div>
  ))}
  {/* Add Column Card */}
</div>
```

### 2. Drag-and-Drop Reordering

**Approach:** Use native HTML5 drag-and-drop since no external library is installed.

**New State:**
```typescript
const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
```

**Handler Functions:**
```typescript
const handleDragStart = (e: React.DragEvent, columnId: string) => {
  setDraggedColumn(columnId);
  e.dataTransfer.effectAllowed = "move";
};

const handleDragOver = (e: React.DragEvent, columnId: string) => {
  e.preventDefault();
  if (columnId !== draggedColumn) {
    setDragOverColumn(columnId);
  }
};

const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
  e.preventDefault();
  if (!draggedColumn || draggedColumn === targetColumnId) return;
  
  const columns = [...formData.dynamicColumns];
  const dragIndex = columns.findIndex(c => c.id === draggedColumn);
  const targetIndex = columns.findIndex(c => c.id === targetColumnId);
  
  const [removed] = columns.splice(dragIndex, 1);
  columns.splice(targetIndex, 0, removed);
  
  updateFormData({ dynamicColumns: columns });
  setDraggedColumn(null);
  setDragOverColumn(null);
};
```

**Visual Feedback:**
```tsx
<div
  draggable
  onDragStart={(e) => handleDragStart(e, col.id)}
  onDragOver={(e) => handleDragOver(e, col.id)}
  onDrop={(e) => handleDrop(e, col.id)}
  className={cn(
    "cursor-grab active:cursor-grabbing transition-all",
    dragOverColumn === col.id && "ring-2 ring-primary ring-offset-2",
    draggedColumn === col.id && "opacity-50"
  )}
>
```

### 3. Column Collapsing with Rotated Vertical Title

**New State:**
```typescript
const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
```

**Toggle Function:**
```typescript
const toggleCollapse = (columnId: string) => {
  setCollapsedColumns(prev => {
    const next = new Set(prev);
    if (next.has(columnId)) {
      next.delete(columnId);
    } else {
      next.add(columnId);
    }
    return next;
  });
};
```

**Collapsed Column Rendering:**
```tsx
{collapsedColumns.has(col.id) ? (
  // Collapsed state - vertical title
  <div 
    onClick={() => toggleCollapse(col.id)}
    className="w-12 min-h-[300px] border rounded-xl flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
  >
    <span 
      className="font-semibold text-sm whitespace-nowrap"
      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
    >
      {col.displayName} ({items.length})
    </span>
  </div>
) : (
  // Expanded state - full column
  <div className="w-72 border rounded-xl p-4 space-y-4">
    {/* Collapse button in header */}
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={() => toggleCollapse(col.id)}
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>
    {/* Rest of column content */}
  </div>
)}
```

### 4. Column Deletion with Confirmation

**New State:**
```typescript
const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
```

**Delete Handler:**
```typescript
const handleDeleteColumn = (columnId: string) => {
  const column = formData.dynamicColumns.find(c => c.id === columnId);
  if (!column) return;
  
  // Remove column from dynamicColumns
  const updatedColumns = formData.dynamicColumns.filter(c => c.id !== columnId);
  
  // Remove column data from scratchData
  const { [columnId]: removed, ...updatedScratchData } = formData.scratchData;
  
  // Remove or update patterns that reference this variable
  const varPattern = `{{${column.variableName}}}`;
  const updatedPatterns = formData.titlePatterns.filter(pattern => {
    // Keep patterns that don't use this variable, warn about ones that do
    return !pattern.pattern.toLowerCase().includes(varPattern.toLowerCase());
  });
  
  // Warn user if patterns were removed
  const patternsRemoved = formData.titlePatterns.length - updatedPatterns.length;
  
  updateFormData({
    dynamicColumns: updatedColumns,
    scratchData: updatedScratchData,
    titlePatterns: updatedPatterns,
  });
  
  setColumnToDelete(null);
  
  if (patternsRemoved > 0) {
    toast.warning(`${patternsRemoved} pattern(s) using {{${column.variableName}}} were removed`);
  }
};
```

**Confirmation Dialog:**
```tsx
<AlertDialog open={!!columnToDelete} onOpenChange={() => setColumnToDelete(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Column?</AlertDialogTitle>
      <AlertDialogDescription>
        This will delete "{columnToDelete && formData.dynamicColumns.find(c => c.id === columnToDelete)?.displayName}" 
        and all its items. Patterns using this variable will also be removed.
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction 
        onClick={() => columnToDelete && handleDeleteColumn(columnToDelete)}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 5. AI-Powered Autofill (Magic Wand)

**New State:**
```typescript
const [aiColumnId, setAiColumnId] = useState<string | null>(null);
const [aiPrompt, setAiPrompt] = useState("");
const [isGenerating, setIsGenerating] = useState(false);
```

**New Edge Function:** `supabase/functions/generate-column-items/index.ts`

```typescript
// Uses the existing Lovable AI Gateway pattern
const systemPrompt = `You are a data generation assistant. Generate a list of items based on user criteria.`;

// Tool calling for structured output
const tools = [{
  type: "function",
  function: {
    name: "generate_items",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { type: "string" },
          description: "List of generated items"
        }
      },
      required: ["items"]
    }
  }
}];
```

**Frontend Handler:**
```typescript
const handleAIGenerate = async (columnId: string, prompt: string) => {
  setIsGenerating(true);
  
  try {
    const column = formData.dynamicColumns.find(c => c.id === columnId);
    const response = await supabase.functions.invoke("generate-column-items", {
      body: {
        column_name: column?.displayName,
        business_type: formData.businessType,
        business_name: formData.businessName,
        prompt: prompt, // e.g., "Cities in France" or "Plumbing services"
        existing_items: formData.scratchData[columnId] || [],
        max_items: 20,
      },
    });
    
    if (response.data?.items) {
      const existingItems = formData.scratchData[columnId] || [];
      const newItems = response.data.items.filter(
        (item: string) => !existingItems.includes(item)
      );
      
      updateFormData({
        scratchData: {
          ...formData.scratchData,
          [columnId]: [...existingItems, ...newItems],
        },
      });
      
      toast.success(`Added ${newItems.length} items`);
    }
  } catch (error) {
    toast.error("Failed to generate items");
  } finally {
    setIsGenerating(false);
    setAiColumnId(null);
    setAiPrompt("");
  }
};
```

**AI Popover UI:**
```tsx
<Popover open={aiColumnId === col.id} onOpenChange={(open) => !open && setAiColumnId(null)}>
  <PopoverTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={() => setAiColumnId(col.id)}
    >
      <Sparkles className="h-4 w-4 text-primary" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-80">
    <div className="space-y-3">
      <h4 className="font-medium">AI Autofill</h4>
      <p className="text-xs text-muted-foreground">
        Describe what items to generate for "{col.displayName}"
      </p>
      <Input
        placeholder="e.g., Cities in France, Plumbing services..."
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAIGenerate(col.id, aiPrompt)}
      />
      <Button 
        className="w-full" 
        onClick={() => handleAIGenerate(col.id, aiPrompt)}
        disabled={!aiPrompt.trim() || isGenerating}
      >
        {isGenerating ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" /> Generate Items</>
        )}
      </Button>
    </div>
  </PopoverContent>
</Popover>
```

---

## File Changes Summary

| File | Type | Description |
|------|------|-------------|
| `src/components/campaigns/steps/BuildFromScratchStep.tsx` | Modify | Complete overhaul: horizontal layout, reordering, collapsing, deleting, AI button |
| `supabase/functions/generate-column-items/index.ts` | Create | New edge function for AI item generation |
| `supabase/config.toml` | Modify | Add new edge function configuration |

---

## Updated Column Card Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⋮ Drag Handle                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────┐             │
│  │ Services    │  │ Cities      │  │ Indus-      │  │ +  │             │
│  │ {{services}}│  │ {{cities}}  │  │ tries       │  │Add │             │
│  │ ✨ 🗑 ◀     │  │ ✨ 🗑 ◀     │  │(collapsed)  │  │Col │             │
│  │             │  │             │  │             │  │    │             │
│  │ • Plumbing  │  │ • New York  │  │     ↑       │  │    │             │
│  │ • Electric  │  │ • LA        │  │   click     │  │    │             │
│  │ • HVAC      │  │ • Chicago   │  │  to expand  │  │    │             │
│  │             │  │             │  │             │  │    │             │
│  │ [Add Item]  │  │ [Add Item]  │  │             │  │    │             │
│  │ [Add Servic]│  │ [Add Cities]│  │             │  │    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────┘             │
│                                                                         │
│  ← Scroll horizontally if needed →                                      │
└─────────────────────────────────────────────────────────────────────────┘

Header Icons:
  ✨ = AI Magic Wand (opens autofill popover)
  🗑 = Delete column (opens confirmation dialog)
  ◀ = Collapse column (rotates title vertically)
```

---

## Edge Function: generate-column-items

```typescript
// supabase/functions/generate-column-items/index.ts

serve(async (req) => {
  const { column_name, business_type, business_name, prompt, existing_items, max_items } = await req.json();
  
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const systemPrompt = `You are a data assistant for ${business_name}, a ${business_type} business.
Generate a list of ${column_name} based on the user's criteria.
Existing items (avoid duplicates): ${existing_items.join(", ")}
Return exactly the items requested, no explanations.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${max_items} ${column_name} items: ${prompt}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "generate_items",
          parameters: {
            type: "object",
            properties: {
              items: { type: "array", items: { type: "string" } }
            },
            required: ["items"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "generate_items" } },
    }),
  });
  
  // Parse and return items...
});
```

---

## New Imports Required

```typescript
import { 
  Plus, X, Trash2, Tags, 
  ChevronLeft, ChevronRight, 
  GripVertical, Sparkles, Loader2 
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
```

---

## Testing Checklist

- [ ] Columns render side-by-side horizontally
- [ ] Horizontal scroll works when many columns
- [ ] Drag and drop reorders columns
- [ ] Column order persists in formData.dynamicColumns
- [ ] Collapse button shrinks column to vertical title
- [ ] Collapsed title shows column name rotated bottom-to-top
- [ ] Click collapsed column to expand
- [ ] Delete button shows confirmation dialog
- [ ] Deleting column removes associated patterns
- [ ] Toast notification shows removed patterns count
- [ ] AI magic wand opens popover
- [ ] AI generation adds items to column
- [ ] AI avoids duplicating existing items
- [ ] Error handling for AI rate limits (429) and credits (402)


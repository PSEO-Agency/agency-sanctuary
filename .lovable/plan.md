

# Plan: Add Filtering and Search to Roadmap Board

## Overview

Add category filtering, search functionality, and date-based sorting to the Roadmap Kanban board. Features will be filtered by category dropdown and sorted with most recent implementation dates first.

## Current Architecture

- **Features.tsx**: Main page component with header and Kanban board
- **FeatureKanbanBoard.tsx**: Renders the Kanban columns with drag-and-drop
- **useFeatureBoard.ts**: Hook fetching features sorted by position (ascending)
- **FEATURE_CATEGORIES**: Predefined list of categories in the hook

## Changes Required

### 1. Update Features.tsx (Main Page)

Add filter controls above the Kanban board:

```text
+------------------------------------------------------------------+
| Roadmap                                                           |
| Track and manage platform features                                |
+------------------------------------------------------------------+
| [Category: View All ▼]  [🔍 Search features...]   [Stages] [+Add] |
+------------------------------------------------------------------+
| Backlog | In Progress | Review | Done                             |
+------------------------------------------------------------------+
```

**State additions:**
- `categoryFilter: string` - "all" or specific category name
- `searchQuery: string` - search input value

**Filter/Sort logic:**
- Filter features by selected category (or show all)
- Filter by search query (matches title or description)
- Sort by `implemented_at` descending (most recent first), then by `position` descending

### 2. Update FeatureKanbanBoard.tsx

Accept new props for filtered/sorted features:

```typescript
interface FeatureKanbanBoardProps {
  stages: FeatureStage[];
  features: FeatureRequest[];  // Already filtered and sorted
  // ... existing props
}
```

Update `getStageFeatures` to respect the pre-sorted order:

```typescript
const getStageFeatures = (stageId: string) =>
  features.filter((f) => f.stage_id === stageId);
  // No additional sorting - already sorted by parent
```

### 3. Sorting Logic

For features with the same `implemented_at` date (or null), reverse the position order:

```typescript
const sortedFeatures = [...features].sort((a, b) => {
  // Primary: implemented_at descending (most recent first)
  const dateA = a.implemented_at ? new Date(a.implemented_at).getTime() : 0;
  const dateB = b.implemented_at ? new Date(b.implemented_at).getTime() : 0;
  if (dateB !== dateA) return dateB - dateA;
  
  // Secondary: position descending (flip existing order)
  return b.position - a.position;
});
```

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/super-admin/Features.tsx` | Modify | Add category filter dropdown, search input, and sorting logic |
| `src/components/features/FeatureKanbanBoard.tsx` | Modify | Remove internal sorting, accept pre-sorted features |

## Implementation Details

### Features.tsx Updates

```typescript
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FEATURE_CATEGORIES } from "@/hooks/useFeatureBoard";

// New state
const [categoryFilter, setCategoryFilter] = useState<string>("all");
const [searchQuery, setSearchQuery] = useState("");

// Filtered and sorted features
const filteredFeatures = useMemo(() => {
  let result = [...features];
  
  // Filter by category
  if (categoryFilter !== "all") {
    result = result.filter((f) => f.category === categoryFilter);
  }
  
  // Filter by search
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    result = result.filter(
      (f) =>
        f.title.toLowerCase().includes(query) ||
        f.description?.toLowerCase().includes(query)
    );
  }
  
  // Sort: implemented_at descending, then position descending
  result.sort((a, b) => {
    const dateA = a.implemented_at ? new Date(a.implemented_at).getTime() : 0;
    const dateB = b.implemented_at ? new Date(b.implemented_at).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    return b.position - a.position;
  });
  
  return result;
}, [features, categoryFilter, searchQuery]);
```

### Filter Controls UI

```tsx
<div className="flex items-center gap-3">
  {/* Category Filter */}
  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="Filter by category" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">View All</SelectItem>
      {FEATURE_CATEGORIES.map((cat) => (
        <SelectItem key={cat} value={cat}>
          {cat}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  
  {/* Search Input */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search features..."
      className="pl-9 w-[200px]"
    />
  </div>
</div>
```

### FeatureKanbanBoard.tsx Updates

```typescript
const getStageFeatures = (stageId: string) =>
  features.filter((f) => f.stage_id === stageId);
  // Removed: .sort((a, b) => a.position - b.position)
  // Features are already sorted by the parent component
```

## Visual Result

```text
+------------------------------------------------------------------+
| Roadmap                               [Stages] [+ Add Feature]    |
| Track and manage platform features                                |
+------------------------------------------------------------------+
| [Category: pSEO Builder ▼]  [🔍 Search features...]              |
+------------------------------------------------------------------+
| Backlog         | In Progress    | Review    | Done              |
| (0)             | (0)            | (0)       | (22)              |
|                 |                |           |                   |
|                 |                |           | [Entity-Based...] |
|                 |                |           | [AI Template...]  |
|                 |                |           | [Unified Page...] |
|                 |                |           | ...               |
+------------------------------------------------------------------+
```

When "View All" is selected:
- All 28 features visible across stages
- Sorted by implementation date (most recent first)
- Within same date, position reversed (highest position first)

When a category is selected:
- Only features matching that category are shown
- Stage counts update accordingly
- Same sorting applied


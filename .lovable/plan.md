

# Plan: Super Admin Feature Kanban Board

## Overview

Create a Trello-style Kanban board for Super Admins to track feature development. The implementation will be simple, elegant, and use existing patterns from the codebase (native HTML5 Drag & Drop, existing UI components).

## Database Design

### New Table: `feature_requests`

```sql
CREATE TABLE public.feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  stage_id uuid REFERENCES public.feature_stages(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  deadline date,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage features
CREATE POLICY "Super admins can manage features"
  ON public.feature_requests FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));
```

### New Table: `feature_stages`

```sql
CREATE TABLE public.feature_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#e2e8f0', -- Pastel colors
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_stages ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage stages
CREATE POLICY "Super admins can manage stages"
  ON public.feature_stages FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Insert default stages with pastel colors
INSERT INTO public.feature_stages (name, color, position) VALUES
  ('Backlog', '#f1f5f9', 0),      -- Slate pastel
  ('In Progress', '#dbeafe', 1),   -- Blue pastel
  ('Review', '#fef3c7', 2),        -- Amber pastel
  ('Done', '#dcfce7', 3);          -- Green pastel
```

## UI Components

### File Structure

```
src/
  pages/
    super-admin/
      Features.tsx              # Main Kanban page
  components/
    features/
      FeatureKanbanBoard.tsx    # Main board with columns
      FeatureCard.tsx           # Individual feature card
      FeatureDetailDialog.tsx   # Dialog for viewing/editing feature
      StageSettingsDialog.tsx   # Dialog for managing stages
  hooks/
    useFeatureBoard.ts          # React Query hooks for CRUD
```

### Kanban Board Layout

```
+------------------------------------------------------------------+
| Features                                         [ + Add Feature ] |
| Track and manage platform features                [ Stage Settings]|
+------------------------------------------------------------------+
|                                                                    |
| +---------------+ +---------------+ +---------------+ +----------+ |
| | Backlog       | | In Progress   | | Review        | | Done     | |
| | (slate bg)    | | (blue bg)     | | (amber bg)    | |(green bg)| |
| +---------------+ +---------------+ +---------------+ +----------+ |
| |               | |               | |               | |          | |
| | +----------+  | | +----------+  | | +----------+  | |+--------+| |
| | | Feature 1|  | | | Feature 3|  | | | Feature 5|  | ||Feature 6| |
| | | High     |  | | | Medium   |  | | | Low      |  | ||        || |
| | | Dec 15   |  | | +----------+  | | | Jan 10   |  | |+--------+| |
| | +----------+  | |               | | +----------+  | |          | |
| |               | | +----------+  | |               | |          | |
| | +----------+  | | | Feature 4|  | |               | |          | |
| | | Feature 2|  | | +----------+  | |               | |          | |
| | +----------+  | |               | |               | |          | |
| |               | |               | |               | |          | |
| | [+ Add card]  | | [+ Add card]  | | [+ Add card]  | |[+ Add]   | |
| +---------------+ +---------------+ +---------------+ +----------+ |
+------------------------------------------------------------------+
```

### Feature Card Design

```
+------------------------+
| Feature Title          |
|------------------------|
| [Priority Badge]       |
|                        |
| Due: Jan 15, 2026      |
+------------------------+
```

- Cards show: Title, Priority badge (colored), Deadline (if set)
- Click to open detail dialog
- Drag to move between stages or reorder within stage

### Feature Detail Dialog

```
+----------------------------------------+
| Feature Details                    [X] |
+----------------------------------------+
|                                        |
| Title: [________________________]      |
|                                        |
| Description:                           |
| [                                ]     |
| [    Rich text area               ]    |
| [                                ]     |
|                                        |
| Stage:    [Dropdown: Backlog    v]     |
| Priority: [Dropdown: Medium     v]     |
| Deadline: [Date picker: Jan 15  ]      |
|                                        |
| Created: Dec 1, 2025 by Admin          |
|                                        |
|           [Delete]  [Cancel]  [Save]   |
+----------------------------------------+
```

## Technical Implementation

### 1. React Query Hook (`useFeatureBoard.ts`)

```typescript
export function useFeatureBoard() {
  // Fetch stages
  const { data: stages } = useQuery({
    queryKey: ['feature-stages'],
    queryFn: async () => {
      const { data } = await supabase
        .from('feature_stages')
        .select('*')
        .order('position');
      return data;
    }
  });

  // Fetch features
  const { data: features } = useQuery({
    queryKey: ['feature-requests'],
    queryFn: async () => {
      const { data } = await supabase
        .from('feature_requests')
        .select('*')
        .order('position');
      return data;
    }
  });

  // Mutations for CRUD operations
  const createFeature = useMutation(...);
  const updateFeature = useMutation(...);
  const deleteFeature = useMutation(...);
  const moveFeature = useMutation(...);  // For drag & drop

  return { stages, features, createFeature, updateFeature, deleteFeature, moveFeature };
}
```

### 2. Drag & Drop (Native HTML5)

Using the same pattern from `BuildFromScratchStep.tsx`:

```typescript
const handleDragStart = (e: React.DragEvent, featureId: string) => {
  e.dataTransfer.setData('featureId', featureId);
  e.dataTransfer.effectAllowed = 'move';
  setDraggedFeature(featureId);
};

const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
  e.preventDefault();
  const featureId = e.dataTransfer.getData('featureId');
  await moveFeature.mutateAsync({ featureId, targetStageId });
};
```

### 3. Stage Settings Dialog

Simple dialog to:
- Rename stages
- Change pastel colors (predefined palette)
- Reorder stages
- Add/delete stages

### Pastel Color Palette

```typescript
const PASTEL_COLORS = [
  { name: 'Slate', value: '#f1f5f9' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Amber', value: '#fef3c7' },
  { name: 'Green', value: '#dcfce7' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Purple', value: '#f3e8ff' },
  { name: 'Cyan', value: '#cffafe' },
  { name: 'Orange', value: '#ffedd5' },
];
```

## Routing & Navigation

### Update SuperAdmin Router

```typescript
// src/pages/SuperAdmin.tsx
<Route path="/features" element={<Features />} />
```

### Update SuperAdmin Sidebar

```typescript
// Add to menuItems (only for super_admin, not country_partner)
if (isSuperAdmin) {
  menuItems.push({ title: "Features", url: "/super-admin/features", icon: Lightbulb });
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/super-admin/Features.tsx` | Create | Main Kanban page |
| `src/components/features/FeatureKanbanBoard.tsx` | Create | Board with columns |
| `src/components/features/FeatureCard.tsx` | Create | Draggable card component |
| `src/components/features/FeatureDetailDialog.tsx` | Create | Edit/view dialog |
| `src/components/features/StageSettingsDialog.tsx` | Create | Manage stages |
| `src/hooks/useFeatureBoard.ts` | Create | React Query hooks |
| `src/pages/SuperAdmin.tsx` | Modify | Add route |
| `src/components/SuperAdminSidebar.tsx` | Modify | Add nav item |
| Database migration | Create | Tables + RLS policies |

## Key Features Summary

1. **Simple Card Creation**: Quick add via inline input at bottom of each column
2. **Detail Dialog**: Click card to open full editor with title, description, stage, priority, deadline
3. **Drag & Drop**: Move cards between stages and reorder within stages
4. **Pastel Stage Colors**: Each column has a customizable pastel background
5. **Priority Badges**: Visual priority indicators (Low/Medium/High)
6. **Deadline Display**: Shows due date on cards with overdue highlighting
7. **Stage Management**: Add, rename, reorder, and color-customize stages

## Simplicity Principles

- No complex libraries - uses native HTML5 drag & drop
- Leverages existing UI components (Card, Dialog, Button, Input, Badge, Popover)
- Single-page experience - no nested routes
- Inline quick-add for fast entry
- Minimal required fields (just title to create)


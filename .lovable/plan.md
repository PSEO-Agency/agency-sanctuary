

# Plan: Add Category Pills to Roadmap Feature Cards

## Overview

Add a `category` field to feature requests displayed as colorful pills on each card. Categories will help organize features by area (UI/UX, pSEO Builder, Platform, etc.).

## Database Changes

### Add `category` Column to `feature_requests`

```sql
ALTER TABLE public.feature_requests 
ADD COLUMN category text;
```

No constraints needed - categories are free-form text to allow flexibility.

## Predefined Categories with Colors

| Category | Pill Color |
|----------|------------|
| UI/UX | `bg-pink-100 text-pink-700` |
| pSEO Builder | `bg-violet-100 text-violet-700` |
| Content Machine | `bg-blue-100 text-blue-700` |
| Platform | `bg-emerald-100 text-emerald-700` |
| API/Backend | `bg-orange-100 text-orange-700` |
| Security | `bg-red-100 text-red-700` |
| Other | `bg-slate-100 text-slate-600` |

## UI Changes

### 1. FeatureCard - Display Category Pill

```text
+------------------------+
| Feature Title          |
|------------------------|
| [Category] [Priority]  |
| Due: Jan 15, 2026      |
+------------------------+
```

The category badge will appear before the priority badge, with its own color scheme based on the category name.

### 2. FeatureDetailDialog - Add Category Selector

Add a combobox/select field for category selection with predefined options plus the ability to type custom values.

```text
+----------------------------------------+
| Feature Details                    [X] |
+----------------------------------------+
| Title: [________________________]      |
| Description: [___________________]     |
|                                        |
| Category: [Dropdown: pSEO Builder v]   |  <-- NEW
| Stage:    [Dropdown: Done         v]   |
| Priority: [Dropdown: High         v]   |
| Deadline: [Date picker            ]    |
+----------------------------------------+
```

### 3. Hook Update

Update `useFeatureBoard.ts` to include `category` in the `FeatureRequest` interface and mutations.

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | Add `category` column |
| `src/hooks/useFeatureBoard.ts` | Modify | Add `category` to interface and mutations |
| `src/components/features/FeatureCard.tsx` | Modify | Display category pill with color mapping |
| `src/components/features/FeatureDetailDialog.tsx` | Modify | Add category selector with predefined options |

## Category Color Mapping Logic

```typescript
const categoryColors: Record<string, string> = {
  "UI/UX": "bg-pink-100 text-pink-700",
  "pSEO Builder": "bg-violet-100 text-violet-700",
  "Content Machine": "bg-blue-100 text-blue-700",
  "Platform": "bg-emerald-100 text-emerald-700",
  "API/Backend": "bg-orange-100 text-orange-700",
  "Security": "bg-red-100 text-red-700",
};

const getCategoryColor = (category: string) => {
  return categoryColors[category] || "bg-slate-100 text-slate-600";
};
```

## Visual Result

Cards will display like:

```
+----------------------------------+
| Role-Based Theming System        |
|----------------------------------|
| [UI/UX]  [high]                  |
+----------------------------------+

+----------------------------------+
| AI Template Generator            |
|----------------------------------|
| [pSEO Builder]  [medium]         |
| Dec 15                           |
+----------------------------------+
```


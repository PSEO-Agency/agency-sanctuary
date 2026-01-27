

# Role-Based Theming System

## Overview

This plan addresses two issues:
1. **Bug Fix**: Country Partner users incorrectly seeing "Super Admin" label
2. **Visual Clarity**: Implement distinct color themes for each portal type to reduce confusion when switching between dashboards

## Proposed Theme Colors

| Portal | Primary Color | Sidebar Style |
|--------|--------------|---------------|
| **Subaccount** | Purple (262, 83%, 58%) | Gradient sidebar like reference image |
| **Agency** | Blue (217, 91%, 60%) | Gradient sidebar |
| **Country Partner** | Orange (25, 95%, 53%) | Gradient sidebar |
| **Super Admin** | Slate/Neutral (220, 9%, 46%) | Clean neutral sidebar |

## Visual Reference

Based on the uploaded image, the sidebar will feature:
- Rounded container with gradient background
- White/light text for nav items
- Semi-transparent highlight for active items
- Soft shadow and rounded corners

---

## Implementation Plan

### Phase 1: Create Theme Context and CSS Variables

**New File: `src/contexts/ThemeContext.tsx`**

Create a context that provides role-based theming:
- Detects current portal type from URL path (`/super-admin`, `/agency`, `/subaccount`)
- Sets appropriate CSS variables dynamically
- Provides theme info to components

**File: `src/index.css`**

Add new CSS variable sets for each role theme:
- `.theme-subaccount` - Purple gradient sidebar
- `.theme-agency` - Blue gradient sidebar  
- `.theme-partner` - Orange gradient sidebar
- `.theme-super-admin` - Neutral/slate sidebar

### Phase 2: Update Layout Components

**File: `src/components/layout/SuperAdminLayout.tsx`**

1. Fix role display logic - ensure country_partner shows "Country Partner" label
2. Apply `.theme-partner` or `.theme-super-admin` class based on actual role
3. Update header styling to reflect current theme

**File: `src/components/layout/AgencyLayout.tsx`**

1. Apply `.theme-agency` class
2. Update header accent colors to blue
3. Update BETA badge styling

**File: `src/components/layout/SubaccountLayout.tsx`**

1. Apply `.theme-subaccount` class
2. Keep current purple styling (default)

### Phase 3: Redesign Sidebars with Gradient Backgrounds

**File: `src/components/SubaccountSidebar.tsx`**

Redesign to match reference image:
- Rounded container with purple gradient (`from-violet-500 to-purple-600`)
- White text for menu items
- Semi-transparent white background for active/hover states
- Remove border, add subtle shadow

**File: `src/components/AgencySidebar.tsx`**

Apply blue gradient theme:
- Blue gradient (`from-blue-500 to-blue-600`)
- Same structure as subaccount sidebar

**File: `src/components/SuperAdminSidebar.tsx`**

Apply role-specific theme:
- For Country Partners: Orange gradient (`from-orange-500 to-amber-600`)
- For Super Admins: Neutral slate (`from-slate-600 to-slate-700`)

### Phase 4: Update Header Styling

Each layout header will feature:
- BETA badge using the current theme's primary color
- Subtle theme indicator (colored bar or accent)

---

## Technical Details

### CSS Variable Structure

```css
.theme-subaccount {
  --theme-primary: 262 83% 58%;
  --theme-gradient-from: 263 70% 50%;
  --theme-gradient-to: 271 81% 45%;
  --sidebar-text: 0 0% 100%;
  --sidebar-text-muted: 0 0% 100% / 0.7;
  --sidebar-active-bg: 0 0% 100% / 0.15;
}

.theme-agency {
  --theme-primary: 217 91% 60%;
  --theme-gradient-from: 217 91% 55%;
  --theme-gradient-to: 224 76% 48%;
  /* ... */
}

.theme-partner {
  --theme-primary: 25 95% 53%;
  --theme-gradient-from: 25 95% 53%;
  --theme-gradient-to: 38 92% 50%;
  /* ... */
}

.theme-super-admin {
  --theme-primary: 220 9% 46%;
  --theme-gradient-from: 220 13% 33%;
  --theme-gradient-to: 217 19% 27%;
  /* ... */
}
```

### Sidebar Component Updates

Each sidebar will use:
```tsx
<Sidebar className={cn(
  collapsed ? "w-14" : "w-60",
  "bg-gradient-to-b from-[hsl(var(--theme-gradient-from))] to-[hsl(var(--theme-gradient-to))]",
  "text-white rounded-2xl m-3 shadow-lg"
)} collapsible="icon">
```

### Role Label Fix

In `SuperAdminLayout.tsx`, update the role detection:
```tsx
// Check country_partner FIRST since it's more specific
const isCountryPartner = hasRole("country_partner");
const isSuperAdmin = hasRole("super_admin");

// Priority: country_partner over super_admin for display purposes
const roleLabel = isCountryPartner && !isSuperAdmin 
  ? "Country Partner" 
  : isSuperAdmin 
  ? "Super Admin" 
  : "Admin";
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Add theme CSS variables for each role |
| `src/components/layout/SuperAdminLayout.tsx` | Fix role label, apply theme class |
| `src/components/layout/AgencyLayout.tsx` | Apply agency theme class |
| `src/components/layout/SubaccountLayout.tsx` | Apply subaccount theme class |
| `src/components/SubaccountSidebar.tsx` | Purple gradient sidebar design |
| `src/components/AgencySidebar.tsx` | Blue gradient sidebar design |
| `src/components/SuperAdminSidebar.tsx` | Orange/neutral gradient based on role |

---

## Benefits

- **Clear Visual Distinction**: Users immediately know which portal they're in
- **Reduced Confusion**: Color coding prevents accidental actions in wrong context
- **Consistent Design Language**: All sidebars follow the same gradient pattern
- **Future-Ready**: Agency whitelabeling can extend this theming system
- **Bug Fixed**: Country Partners correctly labeled


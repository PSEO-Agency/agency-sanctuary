
# Consolidate Table Action Buttons into Dropdown Menu

## Overview

Refactor the action buttons in both the Subaccounts and Agencies tables to reduce horizontal scrolling by:
1. Converting primary actions (View/Manage) to small icon-only buttons with hover tooltips
2. Grouping secondary actions (Transfer, Upgrade, Delete, Assign, Login As) into a "more actions" dropdown menu (three dots icon)

This follows the ElevenLabs table pattern where primary actions are compact icons and secondary actions are hidden in a dropdown.

## Current State

### Subaccounts Table Actions (4 buttons causing scroll)
```text
[View] [Transfer] [Upgrade] [Delete]
```

### Agencies Table Actions (3 buttons)
```text
[Manage] [Assign] [Login As]
```

## Proposed Design

### Subaccounts Table - New Layout
```text
[Eye icon] [MoreVertical dropdown]
    └── Transfer
    └── Upgrade to Agency (Super Admin only)
    └── ────────────────
    └── Delete (destructive)
```

### Agencies Table - New Layout
```text
[Settings icon] [MoreVertical dropdown]
    └── Login As
    └── Assign to Partner (Super Admin only)
```

## Visual Mockup

```text
┌──────────────────────────────────────────────────────────────┐
│ Name          │ Location ID │ Agency │ Created  │ Actions   │
├──────────────────────────────────────────────────────────────┤
│ My Subaccount │ loc_123     │ Acme   │ Jan 15   │ 👁️  ⋮    │
│               │             │        │          │           │
└──────────────────────────────────────────────────────────────┘

Hover over 👁️ shows: "View"

Click ⋮ shows dropdown:
┌─────────────────────┐
│ ↔️ Transfer         │
│ ⬆️ Upgrade to Agency│
│ ─────────────────── │
│ 🗑️ Delete           │
└─────────────────────┘
```

## Implementation Details

### File Changes

#### 1. `src/pages/super-admin/Subaccounts.tsx`

**Add imports:**
- `MoreVertical` from lucide-react
- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger` from ui/dropdown-menu
- `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` from ui/tooltip

**Replace the actions cell (lines 376-409) with:**
```tsx
<TableCell className="text-right">
  <div className="flex justify-end items-center gap-1">
    {/* View button - icon only with tooltip */}
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Eye className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>View</TooltipContent>
    </Tooltip>
    
    {/* More actions dropdown */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleTransferClick(subaccount)}>
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Transfer
        </DropdownMenuItem>
        {isSuperAdmin && (
          <DropdownMenuItem onClick={() => handleUpgradeClick(subaccount)}>
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Upgrade to Agency
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleDeleteClick(subaccount)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</TableCell>
```

#### 2. `src/pages/super-admin/Agencies.tsx`

**Add imports:**
- `MoreVertical`, `Settings` from lucide-react  
- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` from ui/dropdown-menu
- `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` from ui/tooltip

**Replace the actions cell (lines 423-439) with:**
```tsx
<TableCell className="text-right">
  <div className="flex justify-end items-center gap-1">
    {/* Manage button - icon only with tooltip */}
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Manage</TooltipContent>
    </Tooltip>
    
    {/* More actions dropdown */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleLoginAs(agency.id)}>
          <LogIn className="h-4 w-4 mr-2" />
          Login As
        </DropdownMenuItem>
        {isSuperAdmin && (
          <DropdownMenuItem onClick={() => handleAssignClick(agency)}>
            <Globe className="h-4 w-4 mr-2" />
            Assign to Partner
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</TableCell>
```

### Wrap Tables with TooltipProvider

Both tables need to be wrapped with `<TooltipProvider>` at the component level for tooltips to work.

## Benefits

| Before | After |
|--------|-------|
| 4 buttons with text labels | 2 small icons |
| Horizontal scrolling on smaller screens | Fits within table width |
| All actions equally prominent | Primary action visible, secondary tucked away |
| ~300px actions column width | ~80px actions column width |

## Accessibility Considerations

- Tooltips provide text labels for icon-only buttons
- Dropdown menu items include icons and text labels
- Destructive actions are visually distinguished with red color
- Keyboard navigation works via Radix primitives

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/super-admin/Subaccounts.tsx` | Replace action buttons with icon + dropdown pattern |
| `src/pages/super-admin/Agencies.tsx` | Replace action buttons with icon + dropdown pattern |

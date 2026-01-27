
# Align Agency Subaccounts Table with Super Admin Design

## Problem
The Agency dashboard's subaccount table at `src/pages/agency/Subaccounts.tsx` uses the old button layout (4 full-width buttons), while the Super Admin version has already been updated to use the compact "ElevenLabs" style (icon button + dropdown menu).

## Solution
Update the Agency subaccounts table to match the Super Admin design pattern.

## Implementation

### File: `src/pages/agency/Subaccounts.tsx`

**1. Add missing imports:**
```tsx
import { MoreVertical, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

**2. Replace action buttons (lines ~542-569):**

Current (old style):
```tsx
<Button variant="default" size="sm" onClick={...}>
  <ExternalLink /> Switch To
</Button>
<Button variant="outline" size="sm">Manage</Button>
<Button variant="secondary" size="sm" onClick={...}>
  <LogIn /> Login As
</Button>
<Button variant="destructive" size="sm" onClick={...}>
  <Trash2 /> Delete
</Button>
```

New (compact style):
```tsx
<div className="flex items-center justify-end gap-1">
  {/* Primary action: View/Switch To */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleSwitchToSubaccount(subaccount.id)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>View</TooltipContent>
    </Tooltip>
  </TooltipProvider>
  
  {/* Secondary actions in dropdown */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => handleLoginAs(subaccount.id)}>
        <LogIn className="h-4 w-4 mr-2" />
        Login As
      </DropdownMenuItem>
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
```

## Actions Available to Agency Admins

| Action | Type | Notes |
|--------|------|-------|
| **View** | Primary (icon button) | Navigates to subaccount |
| **Login As** | Dropdown item | Impersonate client user |
| **Delete** | Dropdown item (destructive) | Remove subaccount |

Note: "Transfer" and "Upgrade to Agency" are Super Admin-only actions, so they won't be included in the Agency dropdown.

## Future Consideration
To avoid this duplication issue in the future, these action buttons could be extracted into a shared `SubaccountActionButtons` component that accepts props for which actions to show based on the user's role. This would ensure consistency across portals automatically.


Goal: Fix the “blank sidebar” (white text on white background / no visible text) across portals by making the gradient backgrounds actually render inside the Sidebar component’s visible surface, and ensure mobile sidebar uses the same background.

What’s happening (root cause)
- Your portal sidebars (Agency/Subaccount/Super Admin) now pass a gradient via the `style` prop to `<Sidebar ... />`.
- But the shadcn Sidebar implementation (`src/components/ui/sidebar.tsx`) renders an inner element with `bg-sidebar` (which resolves to `--sidebar-background`, currently white).
- That inner `bg-sidebar` layer covers the gradient set on the outer wrapper, so the sidebar background becomes white.
- Meanwhile, your sidebar buttons/labels are styled with `text-white/...`, so the text becomes white on a white background → invisible.

The fix (minimal + robust)
1) Update the shared Sidebar component to apply the passed `style` to the correct element
   File: `src/components/ui/sidebar.tsx`

   Desktop path:
   - Keep existing layout/positioning on the outer fixed container (so margins, width, rounded corners still work from the `className` you pass).
   - Apply `style={style}` to the INNER element that currently has `bg-sidebar` (the one with `data-sidebar="sidebar"`), because that is the element painting the background.
   - Keep `bg-sidebar` as a default fallback for sidebars that don’t pass styles.

   Mobile path:
   - In the `isMobile` branch, apply `style={style}` to `<SheetContent ...>` (since that’s the element that paints the background on mobile).
   - Preserve the width CSS variable logic already in place.

   Collapsible="none" path:
   - Also apply `style={style}` to the returned div there, so custom backgrounds work consistently if ever used.

   Net effect:
   - Your gradients (passed via `style={{ background: 'linear-gradient(...)' }}`) will finally paint on the visible sidebar surface, instead of being hidden behind `bg-sidebar`.
   - Text becomes readable immediately, since the background will no longer be white.

2) (Optional but recommended) Make sidebar semantic colors theme-aware
   File: `src/index.css`

   Why:
   - Some internal sidebar hover/active styles in `SidebarMenuButton` use `text-sidebar-accent-foreground`, etc. If any menu items don’t fully override those, you can get mixed/incorrect contrast.
   What:
   - In each `.theme-*` class, optionally set:
     - `--sidebar-foreground: 0 0% 100%`
     - `--sidebar-accent-foreground: 0 0% 100%`
     - `--sidebar-border` to a subtle white alpha
   This step is not required to fix the “blank” issue, but improves consistency.

3) Verify in each portal (manual QA checklist)
- Agency portal: `/agency/:id` (your current route)
  - Sidebar shows blue gradient
  - Menu items are visible
  - Hover/active states remain readable
- Super Admin: `/super-admin`
  - Slate gradient visible
  - “Settings” item visible in footer
- Country Partner (super-admin layout with partner role):
  - Orange gradient visible
- Subaccount: `/subaccount/:id/...`
  - Purple gradient visible
- Mobile:
  - Open sidebar (Sheet) and confirm gradient background shows (previously it would default to white)

Files to change
- Required:
  - `src/components/ui/sidebar.tsx` (core fix: apply `style` to the actual painted container on desktop + mobile)
- Optional (for stronger color consistency):
  - `src/index.css` (theme classes set `--sidebar-foreground` / `--sidebar-accent-foreground` etc.)

Why this is the best approach
- Fixes the issue at the source (the shared sidebar component), rather than playing whack-a-mole in each individual sidebar.
- Keeps your existing portal sidebar components (AgencySidebar/SubaccountSidebar/SuperAdminSidebar) intact.
- Improves mobile behavior too, which currently won’t show gradients due to where the Sidebar renders its mobile UI.

Rollback option (if you want to compare)
- If anything behaves unexpectedly after the fix, you can restore a previous working version from Edit History.
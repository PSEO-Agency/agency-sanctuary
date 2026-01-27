

# Mode Switch Enhancement Plan

## Overview

This plan enhances the user experience when switching between **Content Machine** and **pSEO Builder** modes by adding a beautiful confirmation modal and automatic navigation to the relevant section.

## Current Behavior

1. User clicks the mode switcher button
2. CSS animation transitions between sidebar sections
3. Mode is saved to localStorage
4. No feedback indicating the switch happened
5. User stays on the current page

## Proposed Changes

### 1. Create a New Modal Component

**File:** `src/components/ModeSwitchDialog.tsx` (new file)

A visually stunning modal that appears when switching modes:

```
+-----------------------------------------------+
|                                               |
|     [Gradient Icon with Animation]            |
|                                               |
|        "Switched to pSEO Builder"             |
|                                               |
|   Build and scale thousands of SEO-optimized  |
|   landing pages. Create targeted campaigns,   |
|   manage your content matrix, and deploy      |
|   at scale with our industry-leading builder. |
|                                               |
|   [Checkbox] Don't show this again            |
|                                               |
|              [ Let's Go! ]                    |
|                                               |
+-----------------------------------------------+
```

**Features:**
- Gradient background matching the purple theme
- Animated icon (Zap for pSEO, FileText for Content Machine)
- Engaging, benefit-focused descriptions
- "Don't show again" checkbox with localStorage persistence
- Primary action button with hover effects
- Smooth entrance/exit animations

### 2. Update SubaccountSidebar Component

**File:** `src/components/SubaccountSidebar.tsx`

**Changes:**
- Add `useNavigate` hook from react-router-dom
- Add state for modal visibility: `showModeSwitchDialog`
- Add state for tracking the new mode being switched to
- Check localStorage for "don't show again" preference
- Modify `toggleMode` function to:
  1. Show modal (if not suppressed)
  2. Navigate to the appropriate route after confirmation
- Pass callback to modal for navigation

### 3. Modal Content Details

**For Content Machine Mode:**
- **Title:** "Welcome to Content Machine"
- **Icon:** FileText with gradient background
- **Description:** "Create in-depth, AI-researched articles that rank. Our Content Machine analyzes top-performing content, builds comprehensive outlines, and generates SEO-optimized articles tailored to your brand voice."

**For pSEO Builder Mode:**
- **Title:** "Welcome to pSEO Builder"  
- **Icon:** Zap with gradient background
- **Description:** "Scale your SEO with programmatic landing pages. Build data-driven campaigns, create dynamic templates, and deploy thousands of targeted pages that convert visitors into customers."

### 4. Automatic Navigation

| Mode Switch | Navigate To |
|-------------|-------------|
| Content Machine | `/subaccount/{id}/projects` (Articles) |
| pSEO Builder | `/subaccount/{id}/campaigns` |

### 5. localStorage Keys

| Key | Purpose |
|-----|---------|
| `sidebar-mode-${subaccountId}` | Existing - stores active mode |
| `hide-mode-switch-dialog` | New - stores "don't show again" preference |

---

## Technical Details

### Component Structure

```text
ModeSwitchDialog.tsx
+-- Props:
|   +-- open: boolean
|   +-- mode: "content-machine" | "pseo-builder"
|   +-- onConfirm: () => void
|   +-- onDontShowAgainChange: (checked: boolean) => void
|
+-- Uses:
    +-- Dialog, DialogContent (shadcn)
    +-- Checkbox (shadcn)
    +-- Button (shadcn)
    +-- Zap, FileText icons (lucide)
```

### Animation Keyframes

The modal will use custom animations:
- **Entrance:** Scale from 0.9 to 1.0 with fade-in
- **Icon:** Subtle pulse/glow effect
- **Background:** Gradient overlay with blur

### File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/ModeSwitchDialog.tsx` | Create | New modal component with mode-specific content |
| `src/components/SubaccountSidebar.tsx` | Modify | Add modal state, navigation, and preference handling |

### User Flow

```text
User clicks mode switcher
        |
        v
Check "don't show again" in localStorage
        |
        +---> If suppressed: Navigate directly + switch mode
        |
        +---> If not suppressed: Show modal
                    |
                    v
              User clicks "Let's Go!"
                    |
                    v
              [If checkbox checked] Save preference
                    |
                    v
              Navigate to target route
                    |
                    v
              Close modal + complete mode switch
```

### Edge Cases

1. **pSEO Builder disabled:** Modal won't show since the switcher itself is hidden
2. **Already on target route:** Navigation will still be attempted (React Router handles this gracefully)
3. **Preference reset:** Users can clear localStorage to see the modal again


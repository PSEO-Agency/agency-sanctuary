
# Plan: Save Campaign Progress at Each Step with Draft Filtering

## Overview

Implement auto-save functionality during campaign creation that persists progress to the database at each step. Draft campaigns that aren't finalized will be hidden from the main campaigns list but can be resumed from a "Continue Draft" entry point.

---

## Database Schema Changes

### Add New Columns to `campaigns` Table

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `wizard_step` | `integer` | `1` | Current step in the wizard (1-5) |
| `is_finalized` | `boolean` | `false` | Whether campaign setup is complete |
| `wizard_state` | `jsonb` | `'{}'` | Full CampaignFormData snapshot |

```sql
-- Migration SQL
ALTER TABLE campaigns 
ADD COLUMN wizard_step integer DEFAULT 1,
ADD COLUMN is_finalized boolean DEFAULT false,
ADD COLUMN wizard_state jsonb DEFAULT '{}'::jsonb;

-- Update existing campaigns to be finalized (backward compatibility)
UPDATE campaigns SET is_finalized = true WHERE is_finalized IS NULL;
```

---

## Technical Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        CAMPAIGN CREATION FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Step 1 ──► Auto-save to DB ──► Step 2 ──► Auto-save ──► ...      │
│       │                              │                              │
│       └──── wizard_step = 1         └──── wizard_step = 2          │
│             is_finalized = false          is_finalized = false      │
│                                                                     │
│   Step 5 (Finish) ──► is_finalized = true ──► Generate Pages       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         CAMPAIGNS LIST PAGE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  📝 You have 2 unfinished campaigns                           │ │
│  │  [Continue "My Campaign"] [Continue "Test Campaign"]          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Finalized Campaigns:                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Campaign A  │ Active │ 45/100 pages │ View │                │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Campaign B  │ Draft  │ 0/50 pages   │ View │                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Changes

### 1. Database Migration

**New migration** to add columns for tracking wizard progress:

- Add `wizard_step` (integer, default 1)
- Add `is_finalized` (boolean, default false)  
- Add `wizard_state` (jsonb, default '{}')
- Backfill existing campaigns as finalized

### 2. useCampaigns Hook Updates

**File: `src/hooks/useCampaigns.ts`**

Changes:
- Update `CampaignDB` interface to include new columns
- Modify `fetchCampaigns` to filter by `is_finalized = true`
- Add `fetchDraftCampaigns` to get unfinished campaigns
- Add `saveDraftCampaign` function for step-by-step saving
- Add `finalizeCampaign` function that sets `is_finalized = true` and generates pages
- Update `createCampaign` to use the new flow

```typescript
interface CampaignDB {
  // ... existing fields
  wizard_step: number;
  is_finalized: boolean;
  wizard_state: CampaignFormData | Record<string, unknown>;
}

// New functions:
const fetchDraftCampaigns = async () => { ... }
const saveDraftCampaign = async (formData, step, campaignId?) => { ... }
const finalizeCampaign = async (campaignId) => { ... }
```

### 3. CreateCampaignDialog Updates

**File: `src/components/campaigns/CreateCampaignDialog.tsx`**

Changes:
- Accept optional `existingCampaignId` prop to resume drafts
- Add `useEffect` to auto-save on step changes
- Debounce saves to avoid excessive DB calls
- Load existing draft data when `existingCampaignId` is provided
- Call `finalizeCampaign` instead of `createCampaign` on completion

```typescript
interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: CampaignFormData) => void;
  existingCampaignId?: string; // NEW: Resume draft
}

// Auto-save effect
useEffect(() => {
  if (open && formData.businessName) {
    debouncedSave(formData, currentStep);
  }
}, [currentStep, formData]);
```

### 4. Campaigns List Page Updates

**File: `src/pages/subaccount/Campaigns.tsx`**

Changes:
- Add state for draft campaigns
- Show "Continue draft" banner when drafts exist
- Add handler for resuming drafts
- Pass `existingCampaignId` to dialog when resuming

```tsx
// Draft campaigns banner
{draftCampaigns.length > 0 && (
  <DraftCampaignsBanner 
    drafts={draftCampaigns}
    onContinue={(id) => {
      setExistingCampaignId(id);
      setIsCreateDialogOpen(true);
    }}
    onDiscard={(id) => deleteCampaign(id)}
  />
)}
```

### 5. New Component: DraftCampaignsBanner

**New file: `src/components/campaigns/DraftCampaignsBanner.tsx`**

A banner component that displays unfinished campaigns with options to continue or discard:

```tsx
interface DraftCampaignsBannerProps {
  drafts: CampaignDB[];
  onContinue: (id: string) => void;
  onDiscard: (id: string) => void;
}

export function DraftCampaignsBanner({ drafts, onContinue, onDiscard }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <FileEdit className="h-4 w-4 text-amber-600" />
        <span className="font-medium">Unfinished Campaigns</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {drafts.map(draft => (
          <div key={draft.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
            <span>{draft.name || "Untitled"}</span>
            <Badge>Step {draft.wizard_step}/5</Badge>
            <Button size="sm" onClick={() => onContinue(draft.id)}>Continue</Button>
            <Button size="sm" variant="ghost" onClick={() => onDiscard(draft.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 6. Types Update

**File: `src/components/campaigns/types.ts`**

Add wizard state to the interface for proper typing:

```typescript
export interface CampaignFormData {
  // ... existing fields
  
  // Wizard progress tracking (for DB sync)
  _campaignId?: string;  // DB record ID when resuming
}
```

---

## Implementation Flow

### Creating a New Campaign

1. User clicks "Add New" → Dialog opens at Step 1
2. User fills Step 1 → On "Next" click:
   - Create campaign record with `wizard_step=1`, `is_finalized=false`
   - Store `wizard_state` JSON with current form data
3. User progresses through steps:
   - Each step change triggers `saveDraftCampaign(formData, step, campaignId)`
   - Updates `wizard_step` and `wizard_state` in DB
4. User clicks "Finish Campaign" on Step 5:
   - Call `finalizeCampaign(campaignId)`
   - Sets `is_finalized = true`
   - Generates campaign pages
   - Shows success toast

### Resuming a Draft

1. User visits Campaigns page
2. `fetchDraftCampaigns()` loads unfinished campaigns
3. Banner displays with "Continue" buttons
4. User clicks "Continue":
   - Sets `existingCampaignId` state
   - Opens dialog with this ID
5. Dialog loads:
   - Fetches campaign by ID
   - Restores `wizard_state` to form data
   - Sets `currentStep` from `wizard_step`
6. User continues from where they left off

### Discarding a Draft

1. User clicks discard button in banner
2. Confirmation dialog appears
3. On confirm: `deleteCampaign(id)` removes the record

---

## Data Flow Diagram

```text
┌──────────────────┐     ┌─────────────────────┐
│  User fills      │     │     Database        │
│  Step 1 form     │────►│  INSERT campaign    │
└──────────────────┘     │  wizard_step=1      │
                         │  is_finalized=false │
                         └─────────────────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────────┐
│  User moves to   │     │  UPDATE campaign    │
│  Step 2          │────►│  wizard_step=2      │
└──────────────────┘     │  wizard_state={...} │
                         └─────────────────────┘
         │
         ▼ (repeat for steps 3-4)
         │
┌──────────────────┐     ┌─────────────────────┐
│  User clicks     │     │  UPDATE campaign    │
│  "Finish"        │────►│  is_finalized=true  │
└──────────────────┘     │  + generate pages   │
                         └─────────────────────┘
```

---

## Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| User closes dialog mid-step | Draft is already saved, can resume later |
| User exits browser | Last saved step is preserved |
| User has multiple drafts | All shown in banner, can continue any |
| User discards a draft | Record deleted from database |
| Existing campaigns (migration) | Backfilled as `is_finalized=true` |
| User goes back to previous step | Save on any step change (forward or backward) |

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_add_campaign_wizard_columns.sql` | Create | Add wizard tracking columns |
| `src/hooks/useCampaigns.ts` | Modify | Add draft functions, update types |
| `src/components/campaigns/CreateCampaignDialog.tsx` | Modify | Add auto-save, draft resume |
| `src/pages/subaccount/Campaigns.tsx` | Modify | Add draft banner, resume flow |
| `src/components/campaigns/DraftCampaignsBanner.tsx` | Create | Draft campaigns UI component |
| `src/components/campaigns/types.ts` | Modify | Add `_campaignId` field |

---

## Technical Notes

- **Debouncing**: Save operations are debounced (500ms) to prevent excessive DB writes during rapid typing
- **Optimistic UI**: The dialog remains responsive while saves happen in the background
- **Error Handling**: Failed saves show a toast but don't block the user's flow
- **Backward Compatibility**: Existing campaigns are marked as finalized via migration
- **File Uploads**: Business logo is saved as base64 in `wizard_state` for draft persistence

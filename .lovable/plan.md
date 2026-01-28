
# Plan: Fix Campaign Creation-to-Page-Generation Sync Issues

## Executive Summary

After extensive analysis of the codebase and database, I've identified **three major categories of issues** causing the campaign creation flow to be out of sync with page generation:

1. **Template Source Mismatch**: When editing/viewing campaign pages, the system uses hardcoded default templates from `campaignTemplates.ts` instead of the user's AI-generated templates stored in `campaign.template_config.entityTemplates`
2. **Variable Leakage**: Hardcoded default variables (`{{service}}`, `{{city}}`) from the "Local Business" template appear in places where user-defined variables (`{{breeds}}`, `{{vaccines}}`) should be used
3. **Entity-Template Association Gap**: Pages are generated with data values but aren't linked to the correct entity-specific template

---

## Issue Analysis

### Issue 1: Template Source Mismatch

**Current Problem:**
- In `CampaignDetailDialog.tsx` (line 56), templates are fetched via `getTemplateForBusinessType(campaign.business_type)` which returns hardcoded templates from `campaignTemplates.ts`
- The AI-generated templates stored in `campaign.template_config.entityTemplates` are **never used** when viewing/editing pages
- `PagePreviewDialog.tsx` (line 50) also fetches from `getTemplateForBusinessType()` instead of the campaign's saved templates

**Evidence from Database:**
The "ABC Cats" campaign has properly saved `entityTemplates` with `{{breeds}}` and `{{vaccines}}` variables, but when pages are viewed, the system falls back to the default LOCAL_BUSINESS_TEMPLATE which uses `{{service}}` and `{{city}}`.

**Files Affected:**
- `src/components/campaigns/detail/CampaignDetailDialog.tsx`
- `src/components/campaigns/detail/PagePreviewDialog.tsx`
- `src/components/campaigns/detail/tabs/PagesTab.tsx`

### Issue 2: Variable Leakage from Default Templates

**Current Problem:**
The `campaignTemplates.ts` file contains hardcoded variables:
```typescript
// LOCAL_BUSINESS_TEMPLATE
content: {
  headline: "Best {{service}} Services in {{city}}",
  ...
}
```

When the system falls back to these templates (due to Issue 1), users see `{{service}}` placeholders instead of their custom `{{breeds}}` variables.

**Additionally:**
- Placeholder hints in UI components reference `{{services}}` as examples (e.g., `MatrixBuilderTab.tsx` line 886)
- These are informational but add to user confusion

### Issue 3: Page-to-Entity Template Association

**Current Problem:**
When pages are generated in `useCampaigns.ts` (`generateCampaignPages` function, line 353):
- Pages correctly store `entityId` in their `data_values`
- But when rendering pages, the code doesn't look up the matching entity template
- Instead, it uses a single fallback template

---

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         CAMPAIGN CREATION FLOW                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 4: Dataset Setup          Step 6: AI Template Generator          │
│  ┌──────────────────┐           ┌──────────────────────────┐           │
│  │ dynamicColumns:  │           │ entityTemplates:          │           │
│  │  - breeds        │  ────────▶│  - ent-breeds: sections[] │           │
│  │  - vaccines      │           │  - ent-vaccines: sections│           │
│  └──────────────────┘           └──────────────────────────┘           │
│                                            │                            │
│                                            ▼                            │
│                    ┌───────────────────────────────────────┐           │
│                    │     campaign.template_config          │           │
│                    │ ┌─────────────────────────────────┐   │           │
│                    │ │ dynamicColumns, entities,       │   │           │
│                    │ │ entityTemplates, titlePatterns  │   │           │
│                    │ └─────────────────────────────────┘   │           │
│                    └───────────────────────────────────────┘           │
│                                            │                            │
└────────────────────────────────────────────┼────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PAGE GENERATION & VIEWING                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  campaign_pages table                                                   │
│  ┌─────────────────────────────────────────────────────────┐           │
│  │ id | title        | data_values                         │           │
│  │ 1  | Cat: Bengal  | { breeds: "Bengal", entityId: "..." }│          │
│  └─────────────────────────────────────────────────────────┘           │
│                                            │                            │
│                                            ▼                            │
│                    ┌───────────────────────────────────────┐           │
│                    │  GET TEMPLATE FOR THIS PAGE           │           │
│                    │                                       │           │
│         CURRENT:   │  getTemplateForBusinessType() ───────▶│ ❌ WRONG  │
│                    │  returns LOCAL_BUSINESS_TEMPLATE     │           │
│                    │  with {{service}}, {{city}}          │           │
│                    │                                       │           │
│         SHOULD BE: │  getTemplateForPage(page, campaign) ──▶│ ✓ CORRECT│
│                    │  looks up entityId in data_values     │           │
│                    │  returns entityTemplates[entityId]   │           │
│                    └───────────────────────────────────────┘           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation Plan

### Phase 1: Create Template Resolution Utility

**New File: `src/lib/campaignTemplateResolver.ts`**

Create a utility function that properly resolves templates for a given page:

```typescript
interface TemplateResolutionResult {
  sections: TemplateSection[];
  style: TemplateStyleConfig;
  images: TemplateImagesConfig;
  source: "entity" | "legacy" | "default";
}

export function resolveTemplateForPage(
  page: CampaignPageDB,
  campaign: CampaignDB
): TemplateResolutionResult {
  const templateConfig = campaign.template_config as any;
  const entityTemplates = templateConfig?.entityTemplates || {};
  
  // 1. Try to get entity-specific template using entityId from page data
  const entityId = page.data_values?.entityId;
  if (entityId && entityTemplates[entityId]) {
    return {
      sections: entityTemplates[entityId].sections,
      style: entityTemplates[entityId].style || DEFAULT_STYLE_CONFIG,
      images: entityTemplates[entityId].images || DEFAULT_IMAGES_CONFIG,
      source: "entity",
    };
  }
  
  // 2. Fallback to first available entity template
  const firstEntityTemplate = Object.values(entityTemplates)[0];
  if (firstEntityTemplate) {
    return {
      ...firstEntityTemplate,
      source: "entity",
    };
  }
  
  // 3. Fallback to legacy templateContent
  if (templateConfig?.sections) {
    return {
      sections: templateConfig.sections,
      style: templateConfig.style || DEFAULT_STYLE_CONFIG,
      images: templateConfig.images || DEFAULT_IMAGES_CONFIG,
      source: "legacy",
    };
  }
  
  // 4. Last resort: use default template based on business type
  return {
    ...getTemplateForBusinessType(campaign.business_type || "local"),
    source: "default",
  };
}
```

### Phase 2: Update CampaignDetailDialog

**File: `src/components/campaigns/detail/CampaignDetailDialog.tsx`**

Replace the hardcoded template lookup with the resolver:

**Before (line 55-56):**
```typescript
// Get template for this campaign's business type
const template = getTemplateForBusinessType(campaign.business_type || "local");
```

**After:**
```typescript
import { resolveTemplateForCampaign } from "@/lib/campaignTemplateResolver";

// Get the campaign's saved templates (not hardcoded defaults)
const templateConfig = resolveTemplateForCampaign(campaign);
```

Also update `handleGenerateContent` to pass the correct entity template:
```typescript
const handleGenerateContent = async (pageId: string) => {
  const page = pages.find(p => p.id === pageId);
  if (!page) return;

  // Resolve template for this specific page
  const resolvedTemplate = resolveTemplateForPage(page, campaign);
  
  const { data, error } = await supabase.functions.invoke("generate-campaign-content", {
    body: {
      page_id: pageId,
      business_name: campaign.business_name,
      business_type: campaign.business_type,
      data_values: page.data_values,
      template_sections: resolvedTemplate.sections, // Use resolved template
      tone_of_voice: "Professional, friendly, and trustworthy",
    },
  });
  // ...
};
```

### Phase 3: Update PagePreviewDialog

**File: `src/components/campaigns/detail/PagePreviewDialog.tsx`**

Replace line 50:
```typescript
// BEFORE
const template = getTemplateForBusinessType(campaign.business_type || "local");

// AFTER
import { resolveTemplateForPage } from "@/lib/campaignTemplateResolver";

const resolvedTemplate = resolveTemplateForPage(page, campaign);
const template = resolvedTemplate; // Use resolved template
```

Update the PreviewCanvas call (around line 444):
```typescript
<PreviewCanvas
  sections={resolvedTemplate.sections}
  styleConfig={resolvedTemplate.style}
  imagesConfig={resolvedTemplate.images}
  dataValues={dataValues}
  generatedContent={localSections}
  viewport="desktop"
  isEditable={true}
  onFieldEdit={handleFieldEdit}
  mode="page"
/>
```

### Phase 4: Update CMSEditorTab

**File: `src/components/campaigns/detail/tabs/CMSEditorTab.tsx`**

The CMS editor also needs access to proper templates for rendering:

```typescript
// Add import
import { resolveTemplateForPage } from "@/lib/campaignTemplateResolver";

// In component, when a page is selected:
const resolvedTemplate = selectedPage 
  ? resolveTemplateForPage(selectedPage, campaign)
  : null;
```

### Phase 5: Update generate-campaign-content Edge Function

**File: `supabase/functions/generate-campaign-content/index.ts`**

The edge function already receives `template_sections` as a parameter, so it should work correctly once the frontend passes the right template. However, add logging to verify:

```typescript
console.log("Using template sections count:", template_sections.length);
console.log("Template section types:", template_sections.map(s => s.type));
```

### Phase 6: Remove Hardcoded Example Variables from UI

**Files to update:**

1. **`src/components/campaigns/detail/tabs/MatrixBuilderTab.tsx`** (line 886)
   Change placeholder from:
   ```
   "e.g., What is {{services}} or Best {{services}} in {{cities}}"
   ```
   To dynamic placeholder based on user's columns:
   ```typescript
   const examplePlaceholder = columnConfigs.length >= 2
     ? `e.g., What is {{${columnConfigs[0].id}}} or Best {{${columnConfigs[0].id}}} in {{${columnConfigs[1].id}}}`
     : `e.g., What is {{${columnConfigs[0]?.id || "variable"}}}`;
   ```

2. **`src/components/campaigns/TitlePatternInput.tsx`** (line 20)
   Make the placeholder dynamic based on available columns.

---

## Summary of Files to Create/Modify

### New Files:
| File | Purpose |
|------|---------|
| `src/lib/campaignTemplateResolver.ts` | Centralized template resolution logic |

### Files to Modify:
| File | Changes |
|------|---------|
| `src/components/campaigns/detail/CampaignDetailDialog.tsx` | Use resolver for template lookup |
| `src/components/campaigns/detail/PagePreviewDialog.tsx` | Use resolver for page-specific templates |
| `src/components/campaigns/detail/tabs/CMSEditorTab.tsx` | Use resolver for template in editor |
| `src/components/campaigns/detail/tabs/PagesTab.tsx` | Pass campaign to child components for resolution |
| `src/components/campaigns/detail/tabs/MatrixBuilderTab.tsx` | Dynamic placeholder text |
| `src/components/campaigns/TitlePatternInput.tsx` | Dynamic placeholder based on columns |
| `supabase/functions/generate-campaign-content/index.ts` | Add logging for debugging |

---

## Expected Behavior After Fix

1. **Template Persistence**: When user creates `{{breeds}}` and `{{vaccines}}` datasets, the AI-generated template using those variables will be:
   - Saved to `campaign.template_config.entityTemplates`
   - Used when generating page content
   - Displayed correctly in page preview and editor

2. **No Variable Leakage**: Users will never see `{{service}}` or `{{city}}` unless they explicitly use the "Local Business" business type with those variables

3. **Entity-Specific Templates**: Each entity (e.g., /breeds/, /vaccines-for-breeds/) can have its own unique template structure

4. **Consistent Flow**: The template created during campaign wizard Step 6 will be the same template used throughout the campaign lifecycle

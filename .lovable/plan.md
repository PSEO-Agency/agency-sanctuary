

# Plan: Keyword Mapper SEO Integration with DataForSEO

## Executive Summary

Based on my analysis of the current implementation and the pSEO workflow, I recommend **DataForSEO** as the primary integration because:

1. **Cost-Effective**: Pay-per-use API (no monthly minimums like Ahrefs/Semrush)
2. **Comprehensive API**: Covers keyword research, difficulty, search volume, and competitor analysis
3. **Programmatic-Friendly**: Designed for bulk operations (perfect for pSEO with 100s of pages)
4. **No OAuth Required**: Simple API key authentication works well with Edge Functions

## Current State Analysis

The Keyword Mapper tab (`KeywordMapperTab.tsx`) currently has:
- Manual keyword entry per page
- Placeholder dropdown for integrations (Semrush, Ahrefs, Moz - all "Coming Soon")
- CSV upload placeholder (non-functional)
- Basic keyword data structure: `{ keyword, kd, volume, clicks, selected }`
- Toggle selection per keyword
- Summary stats (total keywords, selected count)

## Recommended DataForSEO Endpoints

| Feature | Endpoint | Purpose | Cost |
|---------|----------|---------|------|
| Keyword Suggestions | `/keywords_data/google_ads/keywords_for_keywords/live` | Get related keywords from seed keywords | ~$0.075/request |
| Search Volume & CPC | `/keywords_data/google_ads/search_volume/live` | Bulk search volume for keywords | ~$0.04/request |
| Keyword Difficulty | `/dataforseo_labs/google/bulk_keyword_difficulty/live` | KD% score for keywords | ~$0.01/keyword |
| SERP Competitors | `/dataforseo_labs/serp_competitors/live` | Find competing domains | ~$0.01/request |
| Ranked Keywords | `/dataforseo_labs/google/ranked_keywords/live` | Keywords a domain ranks for | ~$0.01/request |

---

## Implementation Plan

### Phase 1: Create DataForSEO Edge Function

**New File: `supabase/functions/dataforseo-keywords/index.ts`**

This edge function will handle all DataForSEO API calls and support multiple operations:

```typescript
interface DataForSEORequest {
  operation: 
    | "keyword_suggestions"    // Get related keywords
    | "search_volume"          // Get volume + CPC for keywords
    | "keyword_difficulty"     // Get KD% for keywords
    | "serp_competitors"       // Get competing domains
    | "competitor_keywords";   // Get keywords from a competitor domain
  keywords?: string[];         // Input keywords (for suggestions, volume, KD)
  domain?: string;             // Competitor domain (for competitor_keywords)
  location_code?: number;      // Default: 2840 (US)
  language_code?: string;      // Default: "en"
  limit?: number;              // Results limit
}
```

Key features:
- Basic Auth with DataForSEO credentials
- Batch processing to minimize API costs
- Error handling with meaningful messages
- Rate limiting awareness

### Phase 2: Add DataForSEO Secret

**Secret Required:** `DATAFORSEO_CREDENTIALS`

Format: `login:password` (Base64 encoded for API calls)

Use the Lovable secrets tool to prompt the user for their DataForSEO API credentials.

### Phase 3: Enhanced Keyword Mapper UI

**File: `src/components/campaigns/detail/tabs/KeywordMapperTab.tsx`**

#### New Features to Add:

**1. Integration Source Selector (Enhanced)**
```
┌─────────────────────────────────────────────────────────────┐
│  Integration Source:        Location:         Language:      │
│  ┌─────────────────────┐   ┌──────────────┐   ┌──────────┐  │
│  │ DataForSEO      ▼  │   │ United States│   │ English  │  │
│  └─────────────────────┘   └──────────────┘   └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**2. Auto-Generate Keywords from Page Data**
- Button: "🪄 Generate Keywords from Page Titles"
- Logic: Extract variable values from each page's `data_values` and use them as seed keywords
- Example: Page "Bengal Cats Guide" → Seed keywords: ["Bengal cats", "Bengal cat care"]

**3. Keyword Suggestions Panel**
```
┌──────────────────────────────────────────────────────────────┐
│  💡 Keyword Suggestions                              [Close] │
├──────────────────────────────────────────────────────────────┤
│  Seed: "bengal cats"                          [🔄 Refresh]   │
│                                                              │
│  ☐ bengal cat breeders        Vol: 12,100    KD: 45%   [+]  │
│  ☐ bengal cat price           Vol: 8,100     KD: 32%   [+]  │
│  ☐ bengal cat personality     Vol: 5,400     KD: 28%   [+]  │
│  ☐ bengal kitten              Vol: 4,400     KD: 38%   [+]  │
│                                                              │
│  [Add Selected to Page]                                      │
└──────────────────────────────────────────────────────────────┘
```

**4. Bulk Enrichment Tool**
- Button: "📊 Fetch Metrics for All Keywords"
- Updates all existing keywords with latest search volume and KD%
- Shows progress bar during bulk operation

**5. Competitor Analysis Panel**
```
┌──────────────────────────────────────────────────────────────┐
│  🔍 Competitor Analysis                              [Close] │
├──────────────────────────────────────────────────────────────┤
│  Enter competitor domain: [___________________] [Analyze]    │
│                                                              │
│  Found 156 keywords for competitor.com:                      │
│                                                              │
│  ☐ best cat breeds            Pos: 3    Vol: 18,100   [+]   │
│  ☐ cat care tips              Pos: 5    Vol: 14,800   [+]   │
│  ☐ indoor cat toys            Pos: 8    Vol: 9,900    [+]   │
│                                                              │
│  [Import Selected Keywords]                                  │
└──────────────────────────────────────────────────────────────┘
```

### Phase 4: Smart Keyword Assignment

**New Component: `KeywordAssignmentDialog.tsx`**

When adding keywords from suggestions or competitor analysis, smart matching:

1. **Auto-Match by Entity**: If keyword contains `{{breed}}` value, assign to that page
2. **Bulk Assign**: Select multiple pages and apply same keywords
3. **Manual Override**: Drag-and-drop keywords to specific pages

### Phase 5: Enhanced Table View

Update the keywords table to show richer data:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Page Title          │ Keywords           │ Volume │ KD  │ CPC   │ Selected │
├─────────────────────┼────────────────────┼────────┼─────┼───────┼──────────┤
│ Bengal Cats Guide   │ bengal cats        │ 12,100 │ 45% │ $1.20 │    ✓     │
│                     │ bengal cat care    │ 5,400  │ 28% │ $0.80 │    ✓     │
│                     │ bengal personality │ 2,900  │ 22% │ $0.60 │          │
├─────────────────────┼────────────────────┼────────┼─────┼───────┼──────────┤
│ Siamese Cats Guide  │ siamese cats       │ 9,900  │ 42% │ $1.10 │    ✓     │
│                     │ siamese cat traits │ 3,200  │ 25% │ $0.70 │    ✓     │
└────────────────────────────────────────────────────────────────────────────┘
```

New columns:
- **CPC**: Cost-per-click (useful for commercial intent)
- **Trend**: Sparkline showing monthly search volume trend (from DataForSEO monthly_searches data)
- **Competition**: LOW/MEDIUM/HIGH badge

---

## Additional Features for Complete pSEO Workflow

### 1. Keyword-to-Content Integration

**Purpose**: Use selected keywords to enhance AI content generation

**Implementation**:
- Pass selected keywords to `generate-campaign-content` edge function
- AI uses keywords for:
  - Meta title optimization
  - Natural keyword placement in content
  - FAQ question generation

**Code Change in `generate-campaign-content/index.ts`**:
```typescript
interface GenerationRequest {
  // ... existing fields
  target_keywords?: string[];  // NEW: Keywords to optimize for
}
```

### 2. Keyword Density Checker

**New Component: `KeywordDensityPanel.tsx`**

After content is generated, analyze:
- Primary keyword usage (recommended: 1-2%)
- Secondary keyword coverage
- Missing keyword opportunities
- Over-optimization warnings

### 3. SERP Preview

**New Component: `SERPPreviewCard.tsx`**

Show how the page would appear in Google search results:
```
┌──────────────────────────────────────────────────────────────┐
│  Bengal Cats Guide - Complete Care Tips | YourBusiness      │
│  https://example.com/breeds/bengal-cats                     │
│  Discover everything about Bengal cats including care tips, │
│  personality traits, and finding reputable breeders...      │
└──────────────────────────────────────────────────────────────┘
Meta Title: 52/60 chars ✓
Meta Description: 142/160 chars ✓
```

### 4. Keyword Cannibalization Check

**Purpose**: Detect when multiple pages target the same keyword

**Implementation**:
- Scan all pages for duplicate primary keywords
- Show warning badge on conflicting pages
- Suggest keyword differentiation

---

## Why Not Ahrefs/Semrush/a-parser?

| Tool | Pros | Cons |
|------|------|------|
| **DataForSEO** | Pay-per-use, bulk-friendly, complete API | Less brand recognition |
| **Ahrefs** | Best backlink data | Expensive ($99/mo min), OAuth complexity |
| **Semrush** | Comprehensive suite | Very expensive ($119/mo min), rate limits |
| **a-parser** | Flexible scraping | Requires self-hosting, legal gray area |

**Recommendation**: Start with DataForSEO, add Ahrefs/Semrush as optional premium integrations later.

---

## File Summary

### New Files to Create:

| File | Purpose |
|------|---------|
| `supabase/functions/dataforseo-keywords/index.ts` | Edge function for all DataForSEO API calls |
| `src/components/campaigns/keywords/KeywordSuggestionsPanel.tsx` | UI for keyword suggestions |
| `src/components/campaigns/keywords/CompetitorAnalysisPanel.tsx` | UI for competitor keyword research |
| `src/components/campaigns/keywords/KeywordAssignmentDialog.tsx` | Smart keyword-to-page assignment |
| `src/components/campaigns/keywords/SERPPreviewCard.tsx` | Google SERP preview component |
| `src/components/campaigns/keywords/KeywordDensityPanel.tsx` | Content keyword analysis |
| `src/hooks/useDataForSEO.ts` | React hook for DataForSEO API calls |

### Files to Modify:

| File | Changes |
|------|---------|
| `src/components/campaigns/detail/tabs/KeywordMapperTab.tsx` | Complete overhaul with new features |
| `src/hooks/useCampaignPages.ts` | Add `cpc` and `trend` to KeywordData interface |
| `supabase/functions/generate-campaign-content/index.ts` | Accept target_keywords parameter |

### Secrets to Add:

| Secret | Format |
|--------|--------|
| `DATAFORSEO_LOGIN` | DataForSEO account email |
| `DATAFORSEO_PASSWORD` | DataForSEO API password |

---

## Expected User Flow

1. **Open Keyword Mapper** → See pages with empty keywords
2. **Click "Generate from Page Titles"** → AI extracts seed keywords from page data
3. **Click "💡 Suggestions"** on a page → DataForSEO returns related keywords with metrics
4. **Select keywords and click "Add"** → Keywords saved to page
5. **Click "Fetch Metrics"** → Bulk update all keywords with latest volume/KD
6. **Optional: Enter competitor domain** → Import competitor's ranking keywords
7. **Generate Content** → AI uses selected keywords for SEO optimization
8. **Review in CMS Editor** → SERP preview shows search appearance

---

## Cost Estimation

For a campaign with 100 pages:
- Initial keyword suggestions: ~$7.50 (100 requests × $0.075)
- Bulk volume lookup: ~$4.00 (100 requests × $0.04)
- Bulk KD lookup: ~$1.00 (100 keywords × $0.01)
- **Total per campaign: ~$12.50**

This is significantly cheaper than Ahrefs ($99/mo) or Semrush ($119/mo) for occasional use.


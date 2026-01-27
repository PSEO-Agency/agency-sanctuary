
# Entity-Based pSEO Builder Architecture

## Overview

This plan introduces a first-class **Entity** concept to the pSEO Builder, treating URL prefixes as distinct content groupings with their own templates. Entities become the organizational backbone for pages, CMS structure, and navbar navigation.

---

## Current State vs. Desired State

| Aspect | Current | Desired |
|--------|---------|---------|
| **Title Pattern UI** | Pattern + URL Prefix | Entity Name + URL Prefix + Pattern |
| **Template Config** | Single `template_config` per campaign | Map of `entity → TemplateContentConfig` |
| **Page Builder (Step 5)** | Edits one global template | Entity selector to edit per-entity templates |
| **Navbar Preview** | Groups by arbitrary column | Groups by Entity (derived from URL prefixes) |
| **CMS Structure** | Flat list of pages | Pages grouped by Entity |

---

## Data Model Changes

### New Interface: `Entity`

```typescript
// src/components/campaigns/types.ts

export interface Entity {
  id: string;           // Unique ID (generated)
  name: string;         // Display name (e.g., "Services")
  urlPrefix: string;    // URL path prefix (e.g., "/services")
  variableHint?: string; // Optional - which variable this entity is primarily based on
}

export interface TitlePattern {
  id: string;
  pattern: string;        // e.g., "What is {{services}}"
  entityId: string;       // NEW: Reference to Entity
}
```

### Updated `CampaignFormData`

```typescript
export interface CampaignFormData {
  // ... existing fields ...
  
  // Step 3B: Build From Scratch
  entities: Entity[];                    // NEW: List of entities
  dynamicColumns: DynamicColumn[];
  scratchData: Record<string, string[]>;
  titlePatterns: TitlePattern[];         // Modified: now includes entityId
  
  // Step 5: Template Editor - Per-Entity Templates
  entityTemplates: Record<string, TemplateContentConfig>;  // NEW: entityId → template
}
```

---

## UI Changes

### 1. BuildFromScratchStep - Entity-First Title Patterns

**Current Flow:**
```
[Add Pattern Input] → [URL Prefix Input (optional)] → [Add Button]
```

**New Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│ Create Title Pattern                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Entity:  [ Services      ▼ ] [+ New Entity]               │
│                                                             │
│  Title:   [ What is {{services}}?            ]              │
│           {{services}}  {{cities}}  {{languages}}           │
│                                                             │
│  URL Prefix: [ /services/                    ]              │
│                                                             │
│                                        [Add Pattern]        │
└─────────────────────────────────────────────────────────────┘
```

**Entity Dropdown Options:**
- Lists existing entities
- "New Entity" option opens inline form to create one
- Auto-suggests entity name from first variable in pattern (e.g., `{{services}}` → "Services")

**Entity Badge in Pattern List:**
```
┌─────────────────────────────────────────────────────────────┐
│ What is {{services}}?                                       │
│ ┌──────────┐ /services/                                     │
│ │ Services │                                → 5 pages       │
│ └──────────┘                                        [🗑]   │
└─────────────────────────────────────────────────────────────┘
```

### 2. TemplateEditorStep - Entity Selector

**New Header Element:**
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back]   Entity: [🏷 Services   ▼]   [Desktop|Tablet|📱]  │
│            ────────────────────                             │
│            ○ Services (5 pages)                             │
│            ○ Cities (12 pages)                              │
│            ○ Locations (3 pages)                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     ┌───────────────────────────────────────────────┐      │
│     │                                               │      │
│     │    [Page Builder Preview for "Services"]     │      │
│     │                                               │      │
│     └───────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Switching entity loads its template config or creates a new one from defaults
- Each entity's template is saved separately in `entityTemplates`
- A subtle "Active Entity" indicator shows which template is being edited
- Progress indicator shows how many entities have templates configured

### 3. Alternative: Entity Progress Bar

Instead of just a dropdown, show a visual progress bar:

```
┌─────────────────────────────────────────────────────────────┐
│ Template Configuration                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │  Services   │  │   Cities    │  │ Locations   │        │
│   │  ✓ Done     │  │  Current    │  │  Pending    │        │
│   │  /services  │  │  /cities    │  │  /locations │        │
│   │  5 pages    │  │  12 pages   │  │  3 pages    │        │
│   └─────────────┘  └─────────────┘  └─────────────┘        │
│   ═══════════════  ═══════════════  ─────────────────       │
│       ▲ Click to edit                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### Update `campaigns` table

The existing `template_config` JSONB field structure changes:

**Current:**
```json
{
  "sections": [...],
  "style": {...},
  "images": {...}
}
```

**New:**
```json
{
  "entities": [
    { "id": "ent-1", "name": "Services", "urlPrefix": "/services" },
    { "id": "ent-2", "name": "Cities", "urlPrefix": "/cities" }
  ],
  "entityTemplates": {
    "ent-1": { "sections": [...], "style": {...}, "images": {...} },
    "ent-2": { "sections": [...], "style": {...}, "images": {...} }
  },
  "defaultTemplate": { "sections": [...], "style": {...}, "images": {...} }
}
```

### Update `campaign_pages` table

Add entity reference in `data_values`:

```json
{
  "services": "Web Development",
  "patternId": "pattern-123",
  "entityId": "ent-1"  // NEW
}
```

---

## File Changes Summary

| File | Change | Description |
|------|--------|-------------|
| `src/components/campaigns/types.ts` | Modify | Add `Entity` interface, update `TitlePattern` and `CampaignFormData` |
| `src/components/campaigns/steps/BuildFromScratchStep.tsx` | Modify | Add entity dropdown/management, update pattern UI |
| `src/components/campaigns/steps/TemplateEditorStep.tsx` | Major Modify | Add entity selector, manage per-entity templates |
| `src/components/page-builder/UnifiedPageBuilder.tsx` | Modify | Accept entity context, show entity indicator |
| `src/hooks/useCampaigns.ts` | Modify | Store entities and entityTemplates in campaign record |
| `src/components/preview/WebsiteShell.tsx` | Modify | Use entities for navbar dropdown grouping |
| `src/pages/Preview.tsx` | Modify | Resolve correct entity template for page |
| `src/components/campaigns/EntitySelector.tsx` | Create | New component for entity selection UI |

---

## Implementation Flow

### Phase 1: Data Model & Types
1. Add `Entity` interface to types
2. Update `TitlePattern` to include `entityId`
3. Add `entities` and `entityTemplates` to `CampaignFormData`
4. Update `initialFormData`

### Phase 2: BuildFromScratchStep UI
1. Create entity management UI (create/edit/select)
2. Modify title pattern input to require entity selection
3. Auto-suggest entity from variable (e.g., `{{services}}` → "Services")
4. Show entity badge on pattern cards

### Phase 3: TemplateEditorStep Enhancement
1. Create `EntitySelector` component (dropdown or progress bar)
2. Load/save per-entity templates
3. Initialize new entity templates from defaults
4. Show completion status for each entity

### Phase 4: Campaign Creation & Preview
1. Update `useCampaigns.ts` to store entity data
2. Add `entityId` to generated page `data_values`
3. Update `Preview.tsx` to resolve entity-specific template
4. Update `WebsiteShell.tsx` to use entities for navbar

---

## Entity Auto-Detection Logic

When a user creates a title pattern, suggest an entity based on:

1. **Variable Detection**: First `{{variable}}` in pattern suggests entity name
   - `"What is {{services}}?"` → suggests "Services" entity

2. **URL Prefix Inference**: If URL prefix is provided, derive entity name
   - `/web-development/` → suggests "Web Development" entity

3. **Existing Entity Matching**: If pattern uses same variable as existing entity, suggest that entity

```typescript
const suggestEntity = (pattern: string, urlPrefix: string, entities: Entity[]): Entity | null => {
  // Extract first variable
  const match = pattern.match(/\{\{(\w+)\}\}/);
  if (match) {
    const varName = match[1];
    
    // Check if an entity already uses this variable
    const existing = entities.find(e => e.variableHint === varName);
    if (existing) return existing;
    
    // Suggest new entity
    return {
      id: `ent-${Date.now()}`,
      name: varName.charAt(0).toUpperCase() + varName.slice(1),
      urlPrefix: urlPrefix || `/${varName.toLowerCase()}/`,
      variableHint: varName,
    };
  }
  return null;
};
```

---

## User Flow Example

1. **User adds data columns**: `{{services}}` with 5 entries, `{{cities}}` with 3 entries

2. **User adds first title pattern**:
   - Types: "What is {{services}}?"
   - System auto-suggests: Entity "Services", URL prefix "/services/"
   - User confirms → Entity created, pattern linked

3. **User adds second title pattern**:
   - Types: "Best {{services}} in {{cities}}"
   - System asks: Which entity? (Suggests "Cities" based on URL structure)
   - User can choose "Services" or "Cities" or create new

4. **User proceeds to Template Editor (Step 5)**:
   - Sees entity progress bar: "Services" | "Cities"
   - Clicks "Services" → Edits template for /services/* pages
   - Clicks "Cities" → Edits template for /cities/* pages
   - Each gets its own sections, style, images

5. **Preview**:
   - Navbar shows: "Services" dropdown, "Cities" dropdown
   - Each dropdown lists pages under that entity
   - Clicking a service page uses Services template
   - Clicking a city page uses Cities template

---

## Edge Cases

1. **Pattern with no variables**: Prompt user to select or create a "General" entity
2. **Multiple variables in pattern**: Ask which entity it belongs to (or default to first variable)
3. **Entity deletion**: Warn if patterns still reference it, offer to reassign
4. **Template inheritance**: New entities can optionally inherit from default or another entity template

---

## Visual Concept: Entity Flow

```
                     DATA COLUMNS
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   {{services}}      {{cities}}      {{languages}}
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ Entity: │      │ Entity: │      │ Entity: │
   │Services │      │ Cities  │      │Languages│
   │/services│      │ /cities │      │  /lang  │
   └────┬────┘      └────┬────┘      └────┬────┘
        │                │                 │
        ▼                ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │Template │      │Template │      │Template │
   │   A     │      │   B     │      │   C     │
   └────┬────┘      └────┬────┘      └────┬────┘
        │                │                 │
        ▼                ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ 5 pages │      │ 15 pages│      │ 3 pages │
   │/services│      │ /cities │      │  /lang  │
   └─────────┘      └─────────┘      └─────────┘
```

---

## Testing Checklist

- [ ] Create campaign with 2+ entities
- [ ] Verify entity auto-suggestion from pattern
- [ ] Switch between entities in Template Editor
- [ ] Verify each entity saves its own template
- [ ] Preview shows correct navbar dropdowns per entity
- [ ] Pages render with correct entity template
- [ ] Edit existing campaign - entities persist
- [ ] Delete entity - patterns reassign correctly

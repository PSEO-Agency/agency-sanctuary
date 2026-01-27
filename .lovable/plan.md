
# Plan: Persist AI Template Generation Progress

## Problem Summary

When generating AI templates for multiple entities in the pSEO builder, the progress is lost if the user:
- Generates a template for Entity 1, approves it
- Starts generating for Entity 2
- Leaves the editor (closes dialog or navigates away)
- Returns to continue

The first entity's template is lost because progress is only saved to the database when ALL entities are completed.

## Root Cause Analysis

### Current Flow (Broken)

```
User generates Entity 1 template
    ↓
Stored in local state: generatedTemplates[entity1.id]
    ↓
User clicks "Approve & Next"
    ↓
currentEntityIndex++ (still local state)
    ↓
User generates Entity 2 template
    ↓
User leaves editor
    ↓
❌ Local state is lost - generatedTemplates and currentEntityIndex reset
    ↓
formData.entityTemplates was NEVER updated (only happens at final approval)
    ↓
Database wizard_state doesn't have the templates
```

### Desired Flow (Fixed)

```
User generates Entity 1 template
    ↓
Stored in local state: generatedTemplates[entity1.id]
    ↓
User clicks "Approve & Next"
    ↓
✅ IMMEDIATELY sync to formData.entityTemplates[entity1.id]
    ↓
CreateCampaignDialog auto-saves formData to database
    ↓
User leaves editor
    ↓
User returns later
    ↓
✅ Dialog opens, reads existing formData.entityTemplates
    ↓
✅ Restores generatedTemplates from formData
    ↓
✅ Calculates currentEntityIndex from what's already done
    ↓
User continues from where they left off
```

---

## Implementation

### Part 1: Modify AITemplateGeneratorDialog

**File**: `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx`

**Changes**:

1. **Initialize from existing formData on open** (replace lines 99-106):
   ```typescript
   useEffect(() => {
     if (open) {
       // Restore previously generated templates from formData
       const existingTemplates: Record<string, GeneratedTemplate> = {};
       Object.entries(formData.entityTemplates || {}).forEach(([entityId, template]) => {
         existingTemplates[entityId] = {
           sections: template.sections as GeneratedSection[],
           style: template.style || { ... },
           images: template.images || { sectionImages: [] },
         };
       });
       setGeneratedTemplates(existingTemplates);
       
       // Find first entity without a template
       const firstIncompleteIndex = entities.findIndex(
         entity => !formData.entityTemplates?.[entity.id]
       );
       setCurrentEntityIndex(firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0);
       
       // Set status based on whether current entity has template
       const currentEntity = entities[firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0];
       if (currentEntity && formData.entityTemplates?.[currentEntity.id]) {
         setGenerationStatus("reviewing");
       } else {
         setGenerationStatus("idle");
       }
       
       setError(null);
     }
   }, [open]);
   ```

2. **Sync immediately on each entity approval** (modify handleApprove):
   ```typescript
   const handleApprove = () => {
     // Get current entity's template
     const currentTemplate = generatedTemplates[currentEntity?.id];
     
     if (currentTemplate) {
       // Immediately sync this entity's template to formData
       const updatedEntityTemplates = {
         ...formData.entityTemplates,
         [currentEntity.id]: {
           sections: currentTemplate.sections,
           style: currentTemplate.style,
           images: currentTemplate.images,
         },
       };
       updateFormData({ entityTemplates: updatedEntityTemplates });
     }
     
     if (currentEntityIndex < entities.length - 1) {
       setCurrentEntityIndex((prev) => prev + 1);
       setGenerationStatus("idle");
     } else {
       // All entities done
       onComplete();
     }
   };
   ```

3. **Also sync after generation completes** (in generateTemplate success block):
   ```typescript
   if (response.data?.success && response.data?.template) {
     const newTemplates = {
       ...generatedTemplates,
       [currentEntity.id]: response.data.template,
     };
     setGeneratedTemplates(newTemplates);
     setGenerationStatus("reviewing");
     
     // Immediately persist to formData (will trigger auto-save)
     const updatedEntityTemplates = {
       ...formData.entityTemplates,
       [currentEntity.id]: {
         sections: response.data.template.sections,
         style: response.data.template.style,
         images: response.data.template.images,
       },
     };
     updateFormData({ entityTemplates: updatedEntityTemplates });
   }
   ```

---

### Part 2: Modify TemplateEditorStep

**File**: `src/components/campaigns/steps/TemplateEditorStep.tsx`

**Changes**:

1. **Initialize completedEntities from existing entityTemplates** (replace line 55):
   ```typescript
   // Track completed entities - initialize from existing templates
   const [completedEntities, setCompletedEntities] = useState<string[]>(() => {
     return Object.keys(formData.entityTemplates || {});
   });
   ```

2. **Set initial selected entity to first incomplete** (enhance line 32-34):
   ```typescript
   // Track which entity is currently being edited - start with first incomplete
   const [selectedEntityId, setSelectedEntityId] = useState<string | null>(() => {
     const existingTemplateIds = Object.keys(formData.entityTemplates || {});
     const firstIncomplete = entities.find(e => !existingTemplateIds.includes(e.id));
     return firstIncomplete?.id || entities[0]?.id || null;
   });
   ```

---

### Part 3: Add Generation Progress Tracking (Optional Enhancement)

**File**: `src/components/campaigns/types.ts`

Add a field to track AI generation status per entity:

```typescript
export interface CampaignFormData {
  // ... existing fields ...
  
  // AI Generation tracking
  aiGenerationProgress?: {
    currentEntityIndex: number;
    completedEntityIds: string[];
    userPrompts?: Record<string, string>; // Per-entity prompts
  };
}
```

This allows restoring the exact position in the AI generator dialog.

---

## Data Flow After Fix

```
┌─────────────────────────────────────────────────────────────────┐
│                  AITemplateGeneratorDialog                       │
│                                                                  │
│  Local State:                    Parent (formData):              │
│  ┌──────────────────┐           ┌──────────────────┐            │
│  │ generatedTemplates│──sync──→ │ entityTemplates   │            │
│  │ currentEntityIndex│──sync──→ │ aiGenerationProgress│          │
│  └──────────────────┘           └──────────────────┘            │
│                                        │                         │
└────────────────────────────────────────│─────────────────────────┘
                                         │
                                         ↓
                            ┌────────────────────────┐
                            │ CreateCampaignDialog   │
                            │ debouncedSave()        │
                            └────────────────────────┘
                                         │
                                         ↓
                            ┌────────────────────────┐
                            │ useCampaigns.ts        │
                            │ saveDraftCampaign()    │
                            │ → wizard_state JSONB   │
                            └────────────────────────┘
                                         │
                                         ↓
                            ┌────────────────────────┐
                            │ campaigns table        │
                            │ wizard_state column    │
                            └────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx` | Initialize from formData on open, sync immediately on each approval |
| `src/components/campaigns/steps/TemplateEditorStep.tsx` | Initialize completedEntities from existing templates |
| `src/components/campaigns/types.ts` | (Optional) Add aiGenerationProgress field to CampaignFormData |

---

## Testing Scenarios

1. **Resume after partial generation**:
   - Generate template for Entity 1
   - Click "Approve & Next"
   - Close dialog/editor
   - Reopen → Should show Entity 2 ready to generate, Entity 1 template preserved

2. **Resume after generation but before approval**:
   - Generate template for Entity 1
   - Don't click approve, close dialog
   - Reopen → Should show Entity 1 in "reviewing" state with template visible

3. **Complete workflow without leaving**:
   - Generate all entities, approve all
   - Should work exactly as before

4. **Resume in Template Editor**:
   - Complete AI generation for 2 of 3 entities
   - Close and reopen
   - Go to Editor tab
   - Should show 2 entities as completed, 1 remaining

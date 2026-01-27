

# Plan: Fix Empty AI Templates & Enforce Review Flow

## Problem Analysis

### Issue 1: Empty Section Content
The AI template generator is returning sections with empty `content: {}` objects. Looking at the network response:
```json
{"sections":[{"name":"Hero Section","type":"hero","content":{},"id":"hero-breeds"}...]}
```

The AI is successfully creating section types and names, but not populating the content fields despite instructions.

**Root Cause:** The tool schema in `generate-template-ai` marks `content` as a generic object without specifying the required fields per section type. The AI is "lazy" and returns empty objects when the structure isn't enforced.

### Issue 2: Review Flow Gaps
- Users cannot edit section content inline before approving
- No mechanism to manually add missing variables/prompts
- Skip button exists but shouldn't

---

## Solution

### Part 1: Fix AI Template Generation (Edge Function)

**File:** `supabase/functions/generate-template-ai/index.ts`

The fix involves two changes:

1. **Add concrete content examples to the prompt** - Give the AI actual JSON examples of what each section type should look like with `{{variable}}` and `prompt(...)` filled in.

2. **Post-process AI output** - If sections come back empty, populate them with sensible defaults based on type and available variables.

#### Updated System Prompt
```typescript
const systemPrompt = `You are an expert landing page architect...

CRITICAL: Every section MUST have populated content fields. Empty content objects are NOT allowed.

EXAMPLE OUTPUT FOR HERO SECTION:
{
  "id": "hero-1",
  "type": "hero",
  "name": "Hero Banner",
  "content": {
    "headline": "Everything About {{breed}}",
    "subheadline": "prompt(\"Write a compelling 1-2 sentence introduction about {{breed}} cats for {{company}}\")",
    "cta_text": "Get a Quote"
  }
}

EXAMPLE OUTPUT FOR FAQ SECTION:
{
  "id": "faq-1",
  "type": "faq",
  "name": "Frequently Asked Questions",
  "content": {
    "title": "Common Questions About {{breed}}",
    "items": [
      "What is the temperament of {{breed}} cats?|prompt(\"Write a detailed answer about {{breed}} cat temperament\")",
      "How much does a {{breed}} cat cost?|prompt(\"Provide pricing information for {{breed}} cats\")"
    ]
  }
}

EXAMPLE OUTPUT FOR PROS_CONS SECTION:
{
  "id": "pros-cons-1",
  "type": "pros_cons",
  "name": "Pros and Cons",
  "content": {
    "title": "Is {{breed}} Right for You?",
    "pros": ["prompt(\"List 3 advantages of owning a {{breed}} cat\")"],
    "cons": ["prompt(\"List 3 potential challenges of owning a {{breed}} cat\")"]
  }
}
...similar examples for each section type...

RULES:
- EVERY section MUST have content fields populated
- Use {{variable}} placeholders from: ${variableList}
- Use prompt("...") for AI-generated text
- Use image_prompt("...") for AI-generated images
- NEVER return content: {} - this is invalid`;
```

#### Default Content Generator (Post-Processing)
```typescript
// After parsing AI response, ensure all sections have content
function ensureContentPopulated(
  sections: any[], 
  variables: string[],
  businessName: string
): any[] {
  return sections.map(section => {
    if (!section.content || Object.keys(section.content).length === 0) {
      section.content = getDefaultContent(section.type, variables, businessName);
    }
    return section;
  });
}

function getDefaultContent(
  type: string, 
  variables: string[],
  businessName: string
): Record<string, any> {
  const mainVar = variables[0] || "item";
  
  const defaults: Record<string, Record<string, any>> = {
    hero: {
      headline: `{{${mainVar}}} - ${businessName}`,
      subheadline: `prompt("Write an engaging introduction about {{${mainVar}}} for ${businessName}")`,
      cta_text: "Learn More"
    },
    features: {
      title: `Key Features of {{${mainVar}}}`,
      items: [
        `prompt("List feature 1 of {{${mainVar}}}")`,
        `prompt("List feature 2 of {{${mainVar}}}")`,
        `prompt("List feature 3 of {{${mainVar}}}")`,
      ]
    },
    content: {
      title: `About {{${mainVar}}}`,
      body: `prompt("Write detailed content about {{${mainVar}}} for ${businessName}")`
    },
    faq: {
      title: `Frequently Asked Questions about {{${mainVar}}}`,
      items: [
        `What is {{${mainVar}}}?|prompt("Answer the question: What is {{${mainVar}}}?")`,
        `Why choose {{${mainVar}}}?|prompt("Explain why {{${mainVar}}} is a good choice")`
      ]
    },
    pros_cons: {
      title: `Pros and Cons of {{${mainVar}}}`,
      pros: [`prompt("List advantages of {{${mainVar}}}")`],
      cons: [`prompt("List disadvantages of {{${mainVar}}}")`]
    },
    pricing: {
      title: `{{${mainVar}}} Pricing`,
      price: `prompt("Estimate price range for {{${mainVar}}}")`,
      description: `prompt("Describe what's included")`,
      cta_text: "Get Quote"
    },
    testimonials: {
      title: "What Our Customers Say",
      items: [
        `prompt("Write a testimonial about {{${mainVar}}}")|Happy Customer`
      ]
    },
    benefits: {
      title: `Benefits of {{${mainVar}}}`,
      items: [
        `prompt("Benefit 1 of {{${mainVar}}}")`,
        `prompt("Benefit 2 of {{${mainVar}}}")`
      ]
    },
    process: {
      title: "How It Works",
      steps: [
        `prompt("Step 1 for {{${mainVar}}}")`,
        `prompt("Step 2 for {{${mainVar}}}")`
      ]
    },
    image: {
      src: `image_prompt("High quality photo of {{${mainVar}}}")`,
      alt: `{{${mainVar}}} image`
    },
    cta: {
      headline: `Ready to Learn About {{${mainVar}}}?`,
      subtext: `Contact ${businessName} today`,
      button_text: "Contact Us"
    }
  };
  
  return defaults[type] || { 
    title: `{{${mainVar}}}`,
    body: `prompt("Write content about {{${mainVar}}}")`
  };
}
```

---

### Part 2: Add Inline Content Editing in Preview

**File:** `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx`

Add an "Edit" mode to the `TemplatePreview` component that allows users to:
1. Click on a section to expand and edit its content fields
2. Edit text fields inline (textarea for prompts/variables)
3. Add/remove items from arrays
4. See changes reflected immediately

#### New State and Handlers
```typescript
// In TemplatePreview component
const [editingSection, setEditingSection] = useState<string | null>(null);
const [editedContent, setEditedContent] = useState<Record<string, Record<string, any>>>({});

const handleContentEdit = (sectionId: string, field: string, value: any) => {
  setEditedContent(prev => ({
    ...prev,
    [sectionId]: {
      ...prev[sectionId],
      [field]: value
    }
  }));
  
  // Update the template in parent state
  const updatedSections = template.sections.map(s => 
    s.id === sectionId 
      ? { ...s, content: { ...s.content, ...editedContent[sectionId], [field]: value } }
      : s
  );
  onTemplateUpdate?.({ ...template, sections: updatedSections });
};
```

#### Inline Editor UI
```tsx
// For each field in section content
{editingSection === section.id && (
  <div className="mt-2 space-y-3 pl-4 border-l-2 border-primary/30">
    {Object.entries(section.content).map(([key, value]) => (
      <div key={key} className="space-y-1">
        <Label className="text-xs font-mono">{key}</Label>
        {Array.isArray(value) ? (
          <div className="space-y-1">
            {value.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input 
                  value={item}
                  onChange={(e) => {
                    const newItems = [...value];
                    newItems[i] = e.target.value;
                    handleContentEdit(section.id, key, newItems);
                  }}
                  className="font-mono text-xs"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    const newItems = value.filter((_, idx) => idx !== i);
                    handleContentEdit(section.id, key, newItems);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleContentEdit(section.id, key, [...value, ""])}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Item
            </Button>
          </div>
        ) : (
          <Textarea
            value={String(value)}
            onChange={(e) => handleContentEdit(section.id, key, e.target.value)}
            className="font-mono text-xs min-h-[60px]"
            placeholder={`Enter ${key}...`}
          />
        )}
      </div>
    ))}
  </div>
)}
```

---

### Part 3: Remove Skip & Add Context-Based Warnings

**File:** `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx`

#### Remove Skip Button
```tsx
// Remove the Skip button entirely from action buttons
<div className="flex justify-end gap-3 pt-4 border-t">
  <Button variant="outline" onClick={generateTemplate} disabled={isGenerating}>
    <RotateCcw className="h-4 w-4 mr-2" />
    Regenerate
  </Button>
  <Button onClick={handleApprove}>
    <Check className="h-4 w-4 mr-2" />
    {currentEntityIndex < entities.length - 1 ? "Approve & Next" : "Approve & Finish"}
  </Button>
</div>
```

#### Context-Based Warnings
Show warnings based on section context, not blanket rules:

```typescript
// Analyze if section is missing expected content for its type
const getSectionWarnings = (section: GeneratedSection, selectedVars: string[]): string[] => {
  const warnings: string[] = [];
  const content = section.content;
  
  // Check if content is empty
  if (!content || Object.keys(content).length === 0) {
    warnings.push("Section has no content - click to add");
    return warnings;
  }
  
  // Check for missing variables in key fields
  const keyFields = ['headline', 'title', 'body', 'subheadline'];
  const hasVariable = keyFields.some(field => 
    content[field] && /\{\{\w+\}\}/.test(String(content[field]))
  );
  
  if (!hasVariable && selectedVars.length > 0) {
    warnings.push(`No variables used in main content`);
  }
  
  // Check if prompts exist for dynamic content
  const hasPrompt = Object.values(content).some(v => 
    /prompt\s*\(/.test(String(Array.isArray(v) ? v.join('') : v))
  );
  
  // For content-heavy sections, warn if no prompts
  if (['content', 'faq', 'pros_cons', 'testimonials'].includes(section.type) && !hasPrompt) {
    warnings.push("Consider adding AI prompts for dynamic content");
  }
  
  return warnings;
};
```

#### Warning Display in Accordion
```tsx
<AccordionItem key={section.id} value={section.id}>
  <AccordionTrigger className="text-sm hover:no-underline">
    <div className="flex items-center gap-2 flex-1">
      <Badge variant="outline" className="text-xs">{section.type}</Badge>
      <span className="font-medium">{section.name}</span>
      {warnings.length > 0 && (
        <Badge variant="destructive" className="text-[10px] px-1.5">
          {warnings.length} issue{warnings.length > 1 ? 's' : ''}
        </Badge>
      )}
      <Button 
        variant="ghost" 
        size="sm" 
        className="ml-auto h-6 px-2"
        onClick={(e) => { e.stopPropagation(); setEditingSection(section.id); }}
      >
        <Pencil className="h-3 w-3 mr-1" /> Edit
      </Button>
    </div>
  </AccordionTrigger>
  <AccordionContent>
    {warnings.length > 0 && (
      <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
        {warnings.map((w, i) => <div key={i}>• {w}</div>)}
      </div>
    )}
    {/* Content fields display/edit */}
  </AccordionContent>
</AccordionItem>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-template-ai/index.ts` | Add concrete examples to prompt, add post-processing to ensure content is populated |
| `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx` | Add inline editing, remove skip button, add context-based warnings, enable template updates |

---

## Technical Implementation Notes

### Edge Function Changes
1. Update system prompt with explicit JSON examples for every section type
2. Add `ensureContentPopulated()` function to post-process AI response
3. Add `getDefaultContent()` fallback generator per section type

### Frontend Changes
1. Add `editingSection` state and `handleContentEdit` handler
2. Add `onTemplateUpdate` prop to `TemplatePreview` for bidirectional updates
3. Replace section display with editable inputs when in edit mode
4. Remove Skip button from action bar
5. Add `getSectionWarnings()` for context-aware warnings
6. Add Edit button per section in accordion header

### Data Flow
```
User clicks "Generate"
    ↓
Edge function calls AI with detailed examples
    ↓
Post-process: ensureContentPopulated() fills any empty sections
    ↓
Return to frontend
    ↓
TemplatePreview shows sections with edit capability
    ↓
User can edit inline if issues detected
    ↓
Changes sync to generatedTemplates state
    ↓
User clicks "Approve" 
    ↓
Template saved to formData.entityTemplates
    ↓
Proceed to next entity (no skip option)
```


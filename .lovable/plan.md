

# Plan: Enhanced Variable Visibility in AI Template Generation

## Problem Statement

When a user writes a natural language prompt like:
> "Let's generate a template for vaccines relevant to a cat breed. This page would include a vaccine variable and breed variable..."

The current system:
1. Passes ALL available variables to the AI (`{{vaccines}}`, `{{breeds}}`, `{{company}}`)
2. Hopes the AI uses them correctly in the generated sections
3. Shows a preview, but doesn't clearly highlight HOW each variable is used in which section

The user has no way to:
- Select which variables should be used in this template
- See a clear breakdown of variable usage before approving
- Verify that the AI understood their intent correctly

---

## Solution Overview

### Part 1: Variable Selection Before Generation

Add a variable picker UI in the "idle" state of `AITemplateGeneratorDialog` where users can:
- See all available variables as toggleable chips
- Select/deselect which variables to include for this entity's template
- See sample values for each variable (from `scratchData`)

### Part 2: Enhanced Variable Usage Preview After Generation

Improve the `TemplatePreview` component to show:
- A section-by-section breakdown of which variables and prompts are used
- Clear visual distinction between `{{variable}}`, `prompt("...")`, and `image_prompt("...")`
- Highlighting of any unused variables (potential issue)

---

## UI Design

### Before Generation (Variable Selection)

```
┌─────────────────────────────────────────────────────────────────┐
│  Ready to Generate                                              │
│  AI will create a custom template for Vaccines Pages            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Select Variables to Use                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ☑ {{vaccines}}     Sample: "Rabies", "FVRCP", "FeLV"     │  │
│  │ ☑ {{breeds}}       Sample: "Persian", "Siamese", "Maine" │  │
│  │ ☐ {{locations}}    Sample: "New York", "Los Angeles"      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ℹ️ Only selected variables will be used in the template       │
│                                                                 │
│  Quick Templates: [🏢 Local] [🐾 Product] [📋 Directory]        │
│                                                                 │
│  Guide the AI:                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Create sections for vaccine benefits, side effects,      │  │
│  │ how many shots needed, pros/cons of this vaccine for... │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│              [ Generate Template for Vaccines ]                 │
└─────────────────────────────────────────────────────────────────┘
```

### After Generation (Variable Usage Preview)

```
┌─────────────────────────────────────────────────────────────────┐
│  Generated Sections                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │  hero  │ │features│ │content │ │pros_cons│ │  faq   │        │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Variable Usage by Section (expand each to see details)        │
│                                                                 │
│  ▼ Hero Section                                                 │
│    ├── headline: "{{vaccines}} for {{breeds}}"                  │
│    │   └─ Variables: {{vaccines}} ✓, {{breeds}} ✓              │
│    ├── subheadline: prompt("Write about {{vaccines}}...")       │
│    │   └─ Variables: {{vaccines}} ✓                            │
│    └── cta_text: "Get Quote" (static)                          │
│                                                                 │
│  ▼ Pros & Cons Section                                          │
│    ├── title: "Pros & Cons of {{vaccines}}"                     │
│    │   └─ Variables: {{vaccines}} ✓                            │
│    ├── pros: [prompt("List benefits of {{vaccines}}...")]       │
│    └── cons: [prompt("List drawbacks of {{vaccines}}...")]      │
│                                                                 │
│  ▼ FAQ Section                                                  │
│    └── items: ["How many shots|prompt(...)"]                    │
│                                                                 │
│  ────────────────────────────────────────────────────────────── │
│  Variable Summary:                                              │
│  • {{vaccines}} → Used in 5/6 sections ✓                       │
│  • {{breeds}} → Used in 2/6 sections ✓                         │
│  • {{company}} → Used in 1/6 sections ✓                        │
│                                                                 │
│              [ Skip ]  [ Regenerate ]  [ Approve & Next ]       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Part 1: Variable Selection State

**File**: `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx`

Add new state and UI:

```typescript
// New state for selected variables
const [selectedVariables, setSelectedVariables] = useState<string[]>(() => {
  // Initialize with all variables selected
  return formData.dynamicColumns.map(c => c.variableName);
});

// In the idle state UI, add variable picker:
<div className="space-y-2">
  <Label className="text-sm font-medium">Select Variables to Use</Label>
  <div className="space-y-2 bg-muted/30 rounded-lg p-3">
    {formData.dynamicColumns.map((col) => {
      const isSelected = selectedVariables.includes(col.variableName);
      const samples = (formData.scratchData[col.id] || []).slice(0, 3);
      return (
        <div 
          key={col.id}
          className={cn(
            "flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50",
            isSelected && "bg-primary/10 border border-primary/20"
          )}
          onClick={() => toggleVariable(col.variableName)}
        >
          <Checkbox checked={isSelected} />
          <Badge variant="secondary" className="font-mono">
            {`{{${col.variableName}}}`}
          </Badge>
          <span className="text-xs text-muted-foreground flex-1">
            {samples.join(", ") || "No samples"}
          </span>
        </div>
      );
    })}
  </div>
  <p className="text-xs text-muted-foreground">
    Only selected variables will be used in the AI-generated template.
  </p>
</div>
```

Pass selected variables to edge function:

```typescript
// In generateTemplate function:
const response = await supabase.functions.invoke("generate-template-ai", {
  body: {
    // ... existing fields ...
    variables: selectedVariables,  // Only pass selected variables
    // ... rest ...
  },
});
```

---

### Part 2: Enhanced Variable Usage Preview

**File**: `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx`

Replace the simple `TemplatePreview` with a detailed variable usage breakdown:

```typescript
function TemplatePreview({ template, entity, variables }: TemplatePreviewProps) {
  // Parse all sections to extract variable and prompt usage
  const sectionAnalysis = template.sections.map(section => {
    const usedVariables: string[] = [];
    const promptFields: string[] = [];
    const imagePromptFields: string[] = [];
    
    const analyzeValue = (value: string | string[]) => {
      const values = Array.isArray(value) ? value : [value];
      values.forEach(v => {
        const str = String(v);
        // Extract {{variable}} patterns
        const varMatches = str.match(/\{\{(\w+)\}\}/g) || [];
        varMatches.forEach(m => {
          const varName = m.replace(/\{\{|\}\}/g, '');
          if (!usedVariables.includes(varName)) {
            usedVariables.push(varName);
          }
        });
        // Check for prompt() patterns
        if (/prompt\s*\(/.test(str)) promptFields.push(str);
        // Check for image_prompt() patterns
        if (/image_prompt\s*\(/.test(str)) imagePromptFields.push(str);
      });
    };
    
    Object.values(section.content).forEach(analyzeValue);
    
    return {
      section,
      usedVariables,
      promptFields,
      imagePromptFields,
    };
  });
  
  // Calculate overall variable usage
  const allVariableNames = variables.map(v => v.variableName);
  const variableUsageSummary = allVariableNames.map(varName => {
    const sectionsUsing = sectionAnalysis.filter(a => 
      a.usedVariables.includes(varName)
    );
    return {
      name: varName,
      usedIn: sectionsUsing.length,
      totalSections: template.sections.length,
    };
  });
  
  return (
    <div className="space-y-6">
      {/* Sections grid - existing */}
      
      {/* NEW: Variable Usage by Section - collapsible */}
      <Accordion type="multiple" className="w-full">
        {sectionAnalysis.map(({ section, usedVariables, promptFields, imagePromptFields }) => (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{section.type}</Badge>
                <span>{section.name}</span>
                {usedVariables.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto mr-2">
                    {usedVariables.length} variables
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                {Object.entries(section.content).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <code className="text-xs bg-muted px-1 rounded">{key}:</code>
                    <HighlightedContent value={value} />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      
      {/* NEW: Variable Usage Summary */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-3">Variable Usage Summary</h4>
        <div className="space-y-2">
          {variableUsageSummary.map(({ name, usedIn, totalSections }) => (
            <div key={name} className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {`{{${name}}}`}
              </Badge>
              <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${(usedIn / totalSections) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {usedIn}/{totalSections} sections
              </span>
              {usedIn > 0 ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper component to highlight variables and prompts in content
function HighlightedContent({ value }: { value: string | string[] }) {
  const str = Array.isArray(value) 
    ? `[${value.map(v => `"${v}"`).join(", ")}]`
    : String(value);
  
  // Highlight patterns
  const highlighted = str
    .replace(/\{\{(\w+)\}\}/g, '<span class="text-primary font-medium">{{$1}}</span>')
    .replace(/prompt\s*\([^)]+\)/g, '<span class="text-amber-600 italic">$&</span>')
    .replace(/image_prompt\s*\([^)]+\)/g, '<span class="text-purple-600 italic">$&</span>');
  
  return (
    <span 
      className="text-muted-foreground ml-2 text-xs"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx` | Add variable selection UI, enhance TemplatePreview with usage analysis |
| `supabase/functions/generate-template-ai/index.ts` | (Optional) Add emphasis in prompt for using selected variables |

---

## User Flow After Implementation

1. **User enters prompt**: "Let's generate a template for vaccines relevant to a cat breed..."

2. **Variable Selection** (new):
   - User sees checkboxes for `{{vaccines}}` and `{{breeds}}`
   - Samples shown: "Rabies, FVRCP, FeLV..." and "Persian, Siamese, Maine Coon..."
   - User ensures both are selected

3. **AI Generation**:
   - Only selected variables passed to AI
   - AI generates sections using those variables

4. **Variable Usage Preview** (new):
   - Accordion shows each section with content breakdown
   - Variables highlighted in blue: `{{vaccines}}`
   - Prompts highlighted in amber: `prompt("...")`
   - Image prompts highlighted in purple: `image_prompt("...")`
   - Summary bar shows: `{{vaccines}} → 5/6 sections`, `{{breeds}} → 3/6 sections`

5. **User Reviews**:
   - Can see exactly where variables are used
   - Can regenerate if AI didn't use variables correctly
   - Approves once satisfied

---

## Benefits

1. **Explicit Variable Selection**: User controls which variables go into the template
2. **Transparency**: Clear visibility into how AI used the variables
3. **Quality Assurance**: Can catch if AI missed variables or used them incorrectly
4. **Better Prompts**: User understands the prompt/variable relationship before generation runs

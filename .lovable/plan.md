
# Comprehensive Plan: Page Builder Layout Fix & AI Template Creator

## Part 1: Page Builder Layout Issues

### Problem Analysis

The page builder in Step 5 of campaign creation has two layout issues:

1. **Top Margin/Navbar Bleeding**: The full-screen portal (`fixed inset-0 z-50`) is correct, but the SubaccountLayout's sticky header (`sticky top-0 z-50 h-16`) is still visible because:
   - The portal is rendered inside the layout component
   - React portal doesn't escape the DOM tree by default
   - The `z-index` values are equal (both z-50)

2. **Not Taking Full Height**: The `TemplateEditorStep` uses `flex flex-col h-full`, but:
   - `h-full` only works if parents have explicit heights
   - The portal wrapper in `CreateCampaignDialog.tsx` (line 135) doesn't specify `h-screen`
   - The `UnifiedPageBuilder` uses `h-full` but its container doesn't define height

### Solution

**File: `src/components/campaigns/CreateCampaignDialog.tsx`**

Update the full-screen portal to use React `createPortal` to render outside the layout DOM tree, and add proper height:

```tsx
import { createPortal } from "react-dom";

// Line 133-138: Use actual portal to escape layout
if (open && currentStep === 5) {
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background flex flex-col h-screen">
      {renderStep()}
    </div>,
    document.body
  );
}
```

Key changes:
- Use `createPortal(...)` to render at document.body level
- Increase z-index to `z-[100]` to ensure it's above the navbar (z-50)
- Add `h-screen` and `flex flex-col` for proper height inheritance

---

## Part 2: AI Template Creator Feature

### Feature Overview

Add an AI-powered template creation option in Step 4 (Template Selection) that:

1. Generates sections, variables, prompts, and blocks based on business context
2. Presents entity-specific templates for approval via a conversational flow
3. Transitions to visual editor only after all entities are approved
4. Adds a sitemap board tab for page hierarchy visualization

### Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAMPAIGN CREATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Step 4: Template Selection                                                  │
│ ┌───────────────┬───────────────┬───────────────┬───────────────┬─────────┐ │
│ │ Modern Local  │ Clean SaaS    │ Professional  │ E-commerce    │   AI    │ │
│ │    [Card]     │    [Card]     │    [Card]     │    [Card]     │ [Card]  │ │
│ │               │               │               │               │   ✨    │ │
│ │               │               │               │               │ Create  │ │
│ │               │               │               │               │ with AI │ │
│ └───────────────┴───────────────┴───────────────┴───────────────┴─────────┘ │
│                                                                             │
│ [If AI selected → Open AI Template Generator Dialog]                        │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼ (AI Template Flow)
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AI TEMPLATE GENERATOR DIALOG                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🤖 Analyzing your campaign for: "My Business"                      │   │
│  │                                                                      │   │
│  │  Entities detected:                                                  │   │
│  │  ├─ Services (15 pages) - /services/                                │   │
│  │  └─ Cities (8 pages) - /cities/                                     │   │
│  │                                                                      │   │
│  │  Generating template for: Services...                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📄 SERVICES TEMPLATE                            [1/2 Entities]     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Sections:                                                          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │   │
│  │  │  HERO   │ │FEATURES │ │ CONTENT │ │   CTA   │                   │   │
│  │  │ section │ │ section │ │ section │ │ section │                   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘                   │   │
│  │                                                                      │   │
│  │  Variables: {{service}}, {{city}}, {{company}}                      │   │
│  │                                                                      │   │
│  │  Hero Headline: "Best {{service}} Services in {{city}}"            │   │
│  │  Hero Subheadline: prompt("Write a compelling introduction...")     │   │
│  │  ...                                                                 │   │
│  │                                                                      │   │
│  │  [👍 Approve]  [✏️ Regenerate]  [➡️ Skip to Next Entity]            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼ (After all entities approved)
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VISUAL EDITOR WITH SITEMAP TAB                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ [← Back]  [Sitemap] [Editor]  [Preview]                    [Finish]         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         SITEMAP (Initial Tab)                               │
│                                                                             │
│                           ┌────────────┐                                    │
│                           │  Homepage  │                                    │
│                           │    (1)     │                                    │
│                           └─────┬──────┘                                    │
│            ┌──────────┬─────────┼─────────┬──────────┐                      │
│            ▼          ▼         ▼         ▼          ▼                      │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│     │ Services │ │  Cities  │ │ About Us │ │Contact Us│ │  Blog    │       │
│     │   (15)   │ │   (8)    │ │   (1)    │ │   (1)    │ │   (0)    │       │
│     └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                                             │
│     Legend: (n) = number of pages                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx` | Dialog for AI template generation flow |
| `src/components/campaigns/steps/SitemapBoard.tsx` | Visual sitemap board component |
| `supabase/functions/generate-template-ai/index.ts` | Edge function for AI template generation |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/campaigns/CreateCampaignDialog.tsx` | Use createPortal, fix height |
| `src/components/campaigns/steps/TemplateSelectionStep.tsx` | Add "Create with AI" card |
| `src/components/campaigns/steps/TemplateEditorStep.tsx` | Add sitemap tab |
| `src/components/campaigns/types.ts` | Add AI template state types |
| `supabase/config.toml` | Register new edge function |

---

## File Changes Detail

### 1. CreateCampaignDialog.tsx - Portal Fix

```tsx
import { createPortal } from "react-dom";

// Update line 133-138
if (open && currentStep === 5) {
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background flex flex-col h-screen overflow-hidden">
      {renderStep()}
    </div>,
    document.body
  );
}
```

### 2. TemplateSelectionStep.tsx - Add AI Option

Add a special "Create with AI" card after the existing templates:

```tsx
import { Sparkles, Loader2 } from "lucide-react";
import { AITemplateGeneratorDialog } from "./AITemplateGeneratorDialog";

// Add state
const [showAIGenerator, setShowAIGenerator] = useState(false);

// Add after templates grid
<div
  onClick={() => setShowAIGenerator(true)}
  className={cn(
    "border rounded-xl overflow-hidden transition-all cursor-pointer",
    "border-dashed border-primary/50 hover:border-primary bg-primary/5"
  )}
>
  <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center">
    <Sparkles className="h-12 w-12 text-primary mb-3" />
    <span className="text-lg font-semibold text-primary">Create with AI</span>
  </div>
  <div className="p-4 space-y-3">
    <h3 className="font-semibold">AI Template Generator</h3>
    <p className="text-sm text-muted-foreground">
      Let AI create sections, prompts, and blocks customized for your business.
    </p>
    <Button className="w-full" variant="outline">
      <Sparkles className="h-4 w-4 mr-2" />
      Start AI Setup
    </Button>
  </div>
</div>

<AITemplateGeneratorDialog
  open={showAIGenerator}
  onOpenChange={setShowAIGenerator}
  formData={formData}
  updateFormData={updateFormData}
  onComplete={() => {
    updateFormData({ selectedTemplate: "ai-generated" });
    setShowAIGenerator(false);
  }}
/>
```

### 3. AITemplateGeneratorDialog.tsx (New File)

```tsx
interface AITemplateGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
  onComplete: () => void;
}

export function AITemplateGeneratorDialog({ ... }) {
  const [currentEntityIndex, setCurrentEntityIndex] = useState(0);
  const [generatedTemplates, setGeneratedTemplates] = useState<Record<string, TemplateContentConfig>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<"idle" | "generating" | "reviewing" | "complete">("idle");

  // Get entities from formData
  const entities = formData.entities || [];
  const currentEntity = entities[currentEntityIndex];

  // Generate template for current entity
  const generateTemplate = async () => {
    setIsGenerating(true);
    setGenerationStatus("generating");
    
    const response = await supabase.functions.invoke("generate-template-ai", {
      body: {
        business_name: formData.businessName,
        business_type: formData.businessType,
        entity: currentEntity,
        variables: formData.dynamicColumns.map(c => c.variableName),
        existing_data: formData.scratchData,
      }
    });
    
    if (response.data) {
      setGeneratedTemplates(prev => ({
        ...prev,
        [currentEntity.id]: response.data.template
      }));
      setGenerationStatus("reviewing");
    }
    setIsGenerating(false);
  };

  // Approve and move to next entity
  const handleApprove = () => {
    if (currentEntityIndex < entities.length - 1) {
      setCurrentEntityIndex(prev => prev + 1);
      setGenerationStatus("idle");
    } else {
      // All entities approved - save to form data
      updateFormData({ entityTemplates: generatedTemplates });
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Template Generator
          </DialogTitle>
          <DialogDescription>
            Creating custom templates for each entity type
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-4">
          {entities.map((entity, idx) => (
            <div key={entity.id} className={cn(
              "flex-1 h-2 rounded-full",
              idx < currentEntityIndex ? "bg-green-500" :
              idx === currentEntityIndex ? "bg-primary" :
              "bg-muted"
            )} />
          ))}
        </div>

        {/* Current entity info */}
        {currentEntity && (
          <div className="bg-muted/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <Tags className="h-4 w-4 text-primary" />
              <span className="font-semibold">{currentEntity.name}</span>
              <span className="text-xs text-muted-foreground font-mono">
                ({currentEntity.urlPrefix})
              </span>
              <Badge variant="outline" className="ml-auto">
                {currentEntityIndex + 1}/{entities.length}
              </Badge>
            </div>
          </div>
        )}

        {/* Generation status */}
        {generationStatus === "idle" && (
          <div className="text-center py-8">
            <Button onClick={generateTemplate} size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Template for {currentEntity?.name}
            </Button>
          </div>
        )}

        {generationStatus === "generating" && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">
              Generating template structure...
            </p>
          </div>
        )}

        {generationStatus === "reviewing" && generatedTemplates[currentEntity?.id] && (
          <TemplatePreview 
            template={generatedTemplates[currentEntity.id]}
            entity={currentEntity}
            variables={formData.dynamicColumns}
          />
        )}

        {/* Action buttons */}
        {generationStatus === "reviewing" && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={generateTemplate}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
            <Button onClick={handleApprove}>
              <Check className="h-4 w-4 mr-2" />
              {currentEntityIndex < entities.length - 1 ? "Approve & Next" : "Approve & Finish"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Template preview component
function TemplatePreview({ template, entity, variables }) {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Generated Sections:</h4>
      <div className="grid grid-cols-4 gap-2">
        {template.sections.map(section => (
          <div key={section.id} className="border rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground uppercase">{section.type}</div>
            <div className="font-medium text-sm">{section.name}</div>
          </div>
        ))}
      </div>

      <h4 className="font-semibold">Variables Used:</h4>
      <div className="flex flex-wrap gap-2">
        {variables.map(v => (
          <Badge key={v.id} variant="secondary" className="font-mono">
            {`{{${v.variableName}}}`}
          </Badge>
        ))}
      </div>

      <h4 className="font-semibold">Content Preview:</h4>
      <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
        {template.sections.map(section => (
          <div key={section.id} className="p-3">
            <div className="text-xs text-muted-foreground mb-1">{section.name}</div>
            {Object.entries(section.content).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="font-mono text-xs text-muted-foreground">{key}:</span>
                <span className="ml-2 truncate">{String(value).substring(0, 100)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. generate-template-ai Edge Function (New File)

```typescript
// supabase/functions/generate-template-ai/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateTemplateRequest {
  business_name: string;
  business_type: string;
  entity: { id: string; name: string; urlPrefix: string };
  variables: string[];
  existing_data: Record<string, string[]>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { business_name, business_type, entity, variables, existing_data }: GenerateTemplateRequest = await req.json();

    console.log("Generating template for entity:", entity.name);

    // Build context for AI
    const dataContext = Object.entries(existing_data)
      .map(([key, values]) => `- ${key}: ${values.slice(0, 3).join(", ")}${values.length > 3 ? "..." : ""}`)
      .join("\n");

    const variableList = variables.map(v => `{{${v}}}`).join(", ");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert landing page architect. Generate a template structure for a ${business_type} business called "${business_name}".

The template is for the "${entity.name}" entity type (URL: ${entity.urlPrefix}).

Available variables: ${variableList}

Data samples:
${dataContext}

Generate a complete page template with 4-6 sections appropriate for this entity type. Each section should have:
- Appropriate headlines using the variables
- AI prompts for dynamic content (use format: prompt("instruction here"))
- Static content with variable placeholders

Focus on SEO-optimized, conversion-focused content structure.`,
          },
          {
            role: "user",
            content: `Generate a landing page template structure for ${entity.name} pages.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_template",
              description: "Create a landing page template with sections",
              parameters: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        type: { type: "string", enum: ["hero", "features", "content", "cta", "faq", "testimonials", "gallery"] },
                        name: { type: "string" },
                        content: {
                          type: "object",
                          additionalProperties: { type: "string" }
                        }
                      },
                      required: ["id", "type", "name", "content"]
                    }
                  }
                },
                required: ["sections"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_template" } },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI Gateway error:", error);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No template generated");
    }

    const template = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        success: true,
        template: {
          sections: template.sections,
          style: {
            primaryColor: "#6366f1",
            backgroundColor: "#ffffff",
            typography: "Inter",
            buttonStyle: "rounded",
            buttonFill: "solid",
            darkMode: false,
          },
          images: {
            sectionImages: [],
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 5. SitemapBoard.tsx (New File)

```tsx
// src/components/campaigns/steps/SitemapBoard.tsx

interface SitemapBoardProps {
  entities: Entity[];
  pagesPerEntity: Record<string, number>;
  staticPages?: Array<{ id: string; name: string; path: string }>;
}

export function SitemapBoard({ entities, pagesPerEntity, staticPages = [] }: SitemapBoardProps) {
  const defaultStaticPages = [
    { id: "homepage", name: "Homepage", path: "/" },
    { id: "about", name: "About Us", path: "/about" },
    { id: "contact", name: "Contact Us", path: "/contact" },
    ...staticPages,
  ];

  return (
    <div className="flex flex-col items-center p-8">
      <h3 className="text-lg font-semibold mb-8 text-muted-foreground">
        Your Site Structure
      </h3>
      
      {/* Homepage node */}
      <div className="relative">
        <div className="bg-primary text-primary-foreground rounded-xl px-6 py-4 shadow-lg">
          <div className="font-semibold">Homepage</div>
          <div className="text-xs opacity-80">1 page</div>
        </div>
        
        {/* Connector line */}
        <div className="absolute left-1/2 -translate-x-1/2 w-px h-8 bg-border" />
      </div>
      
      {/* Child nodes */}
      <div className="flex flex-wrap justify-center gap-4 mt-8 max-w-4xl">
        {/* Entity pages */}
        {entities.map((entity) => (
          <div 
            key={entity.id}
            className="relative bg-card border rounded-xl px-4 py-3 shadow-sm min-w-[140px]"
          >
            {/* Connector */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-px h-4 bg-border" />
            
            <div className="font-medium text-sm">{entity.name}</div>
            <div className="text-xs text-muted-foreground">
              {pagesPerEntity[entity.id] || 0} pages
            </div>
            <div className="text-[10px] text-muted-foreground font-mono mt-1">
              {entity.urlPrefix}*
            </div>
          </div>
        ))}
        
        {/* Static pages */}
        {defaultStaticPages.slice(1).map((page) => (
          <div 
            key={page.id}
            className="relative bg-muted/50 border border-dashed rounded-xl px-4 py-3 min-w-[120px]"
          >
            {/* Connector */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-px h-4 bg-border" />
            
            <div className="font-medium text-sm text-muted-foreground">{page.name}</div>
            <div className="text-xs text-muted-foreground">1 page</div>
            <div className="text-[10px] text-muted-foreground font-mono mt-1">
              {page.path}
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-12 flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Main Page</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-card border" />
          <span>Dynamic Pages (generated)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-muted/50 border border-dashed" />
          <span>Static Pages (optional)</span>
        </div>
      </div>
    </div>
  );
}
```

### 6. TemplateEditorStep.tsx - Add Sitemap Tab

Add a tab system to switch between Sitemap and Editor views:

```tsx
// Add state for active view
const [activeView, setActiveView] = useState<"sitemap" | "editor">("sitemap");

// Update return JSX to include tabs in header
return (
  <div className="flex flex-col h-full">
    {/* View Tabs - Only show for AI-generated templates */}
    {formData.selectedTemplate === "ai-generated" && (
      <div className="border-b px-4 py-2 flex items-center gap-2">
        <Button
          variant={activeView === "sitemap" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveView("sitemap")}
        >
          <Map className="h-4 w-4 mr-2" />
          Sitemap
        </Button>
        <Button
          variant={activeView === "editor" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveView("editor")}
        >
          <Layers className="h-4 w-4 mr-2" />
          Editor
        </Button>
      </div>
    )}

    {/* Sitemap View */}
    {activeView === "sitemap" && (
      <div className="flex-1 overflow-auto">
        <SitemapBoard 
          entities={entities}
          pagesPerEntity={pagesPerEntity}
        />
        <div className="text-center pb-8">
          <Button onClick={() => setActiveView("editor")}>
            Continue to Editor →
          </Button>
        </div>
      </div>
    )}

    {/* Editor View - existing UnifiedPageBuilder */}
    {activeView === "editor" && (
      <>
        {/* Entity banners... */}
        <UnifiedPageBuilder ... />
      </>
    )}
  </div>
);
```

---

## supabase/config.toml Update

```toml
[functions.generate-template-ai]
verify_jwt = false
```

---

## Summary of Changes

| Category | File | Change |
|----------|------|--------|
| **Bug Fix** | `CreateCampaignDialog.tsx` | Use `createPortal` to document.body, add `z-[100]` and `h-screen` |
| **New Feature** | `TemplateSelectionStep.tsx` | Add "Create with AI" card option |
| **New Feature** | `AITemplateGeneratorDialog.tsx` | New dialog for entity-by-entity AI generation |
| **New Feature** | `SitemapBoard.tsx` | Visual sitemap component |
| **New Feature** | `TemplateEditorStep.tsx` | Add Sitemap/Editor tab switcher |
| **New Feature** | `generate-template-ai/index.ts` | Edge function for AI template generation |
| **Config** | `supabase/config.toml` | Register new edge function |
| **Types** | `types.ts` | Add `"ai-generated"` template type |

---

## User Flow Summary

1. User reaches Step 4 (Template Selection)
2. User clicks "Create with AI" card → Opens AI Generator Dialog
3. Dialog shows entity list and generates template for first entity
4. User reviews sections, variables, prompts → Approves or regenerates
5. Process repeats for each entity
6. After all approved → Dialog closes, proceeds to Step 5
7. Step 5 shows Sitemap tab first (illustrative overview)
8. User clicks "Continue to Editor" → Standard visual editor
9. User customizes and clicks "Finish Campaign"

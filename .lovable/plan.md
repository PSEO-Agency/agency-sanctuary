

# Plan: Complete pSEO Builder Template & Generation System

## Vision Summary

Transform the pSEO builder into a complete template creation and content generation system where:
1. Users describe their template in natural language (e.g., "cat breeds with hero, features, pros/cons, FAQ")
2. AI generates a complete template structure with appropriate section types
3. Preview 3 sample pages immediately during campaign creation for confirmation
4. Image placeholders are created in the template, then actual images are generated during page content generation
5. All section types (FAQ, pricing, testimonials, etc.) render properly in previews

---

## Part 1: Remove Singular/Plural Feature

**Rationale**: Users already select their variables directly, so automatic singular/plural aliasing is unnecessary and can cause confusion.

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/templateParser.ts` | Remove `toSingular()` and `toPlural()` functions, simplify `parseStaticPlaceholders()` to direct case-insensitive matching only |
| `supabase/functions/generate-campaign-content/index.ts` | Remove duplicate singular/plural logic, use simple case-insensitive matching |

### Simplified Code

```typescript
// Before (complex)
const toSingular = (k: string) => { ... }
const toPlural = (k: string) => { ... }
Object.entries(data).forEach(([key, value]) => {
  addIfMissing(k, value);
  addIfMissing(toSingular(k), value);
  addIfMissing(toPlural(k), value);
});

// After (simple)
Object.entries(data).forEach(([key, value]) => {
  lowercaseData[key.toLowerCase()] = value;
});
```

---

## Part 2: Add Section Renderers for All Types

Currently, only `hero`, `features`, `content`, and `cta` render properly. Other types show "Coming Soon". We need to add renderers for:

### Section Types to Implement

| Type | Description | Key Fields |
|------|-------------|------------|
| `faq` | Accordion-style Q&A | `title`, `items` (array of Q&A objects) |
| `pricing` | Price card or range display | `title`, `price`, `currency`, `features`, `cta_text` |
| `testimonials` | Customer quotes | `title`, `items` (array of quote objects) |
| `pros_cons` | Two-column comparison | `title`, `pros`, `cons` (arrays) |
| `gallery` | Image grid | `title`, `images` (array of URLs/prompts) |
| `benefits` | Icon/benefit grid | `title`, `items` (array) |
| `process` | Step-by-step flow | `title`, `steps` (array) |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/campaigns/steps/template-editor/TemplatePreviewPanel.tsx` | Add renderSection cases for all new types |
| `src/components/preview/PreviewPageContent.tsx` | Add renderSection cases for all new types |
| `src/components/page-builder/PreviewCanvas.tsx` | Add renderSection cases for all new types (if exists) |

### Example: FAQ Section Renderer

```tsx
case "faq":
  const faqItems = content.items as string[] || [];
  return (
    <div key={section.id} className="py-16 px-8" style={{ backgroundColor: ... }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10">
          {resolvePlaceholder(content.title as string)}
        </h2>
        <div className="space-y-4">
          {faqItems.map((item, i) => {
            // Items can be "Q: ... A: ..." format or just questions
            const parts = item.split('|');
            const question = parts[0] || item;
            const answer = parts[1] || `[AI will generate answer for: ${question}]`;
            return (
              <div key={i} className="border rounded-lg p-4">
                <button className="flex justify-between w-full text-left font-medium">
                  {resolvePlaceholder(question)}
                  <ChevronDown className="h-5 w-5" />
                </button>
                <div className="mt-2 text-muted-foreground">
                  {resolvePlaceholder(answer)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
```

### Example: Pricing Section Renderer

```tsx
case "pricing":
  return (
    <div key={section.id} className="py-16 px-8 bg-muted/30">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-6">
          {resolvePlaceholder(content.title as string)}
        </h2>
        <div className="bg-background rounded-xl p-8 shadow-lg border">
          <div className="text-4xl font-bold mb-2" style={{ color: styleConfig.primaryColor }}>
            {resolvePlaceholder(content.price as string || "$X,XXX")}
          </div>
          <p className="text-muted-foreground mb-6">
            {resolvePlaceholder(content.description as string || "Price range varies")}
          </p>
          <button className={getButtonClasses()} style={{...}}>
            {resolvePlaceholder(content.cta_text as string || "Get Quote")}
          </button>
        </div>
      </div>
    </div>
  );
```

### Example: Pros/Cons Section Renderer

```tsx
case "pros_cons":
  const pros = (content.pros as string[]) || [];
  const cons = (content.cons as string[]) || [];
  return (
    <div key={section.id} className="py-16 px-8">
      <h2 className="text-3xl font-bold text-center mb-10">
        {resolvePlaceholder(content.title as string || "Pros & Cons")}
      </h2>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Pros Column */}
        <div className="bg-green-50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" /> Pros
          </h3>
          <ul className="space-y-2">
            {pros.map((pro, i) => (
              <li key={i} className="flex items-start gap-2 text-green-800">
                <Check className="h-4 w-4 mt-1" />
                {resolvePlaceholder(pro)}
              </li>
            ))}
          </ul>
        </div>
        {/* Cons Column */}
        <div className="bg-red-50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
            <XCircle className="h-5 w-5" /> Cons
          </h3>
          <ul className="space-y-2">
            {cons.map((con, i) => (
              <li key={i} className="flex items-start gap-2 text-red-800">
                <X className="h-4 w-4 mt-1" />
                {resolvePlaceholder(con)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
```

---

## Part 3: Preview 3 Sample Pages During Campaign Creation

After the user approves the AI-generated template, immediately generate 3 sample pages to confirm the template works correctly before finalizing.

### New Component: `SamplePagePreviewStep.tsx`

This step will:
1. Select 3 random data combinations from `scratchData`
2. Call `generate-campaign-content` edge function for each
3. Display all 3 in a carousel/grid view
4. Allow user to approve or regenerate with different prompt

### Flow Change

```
Current Flow:
Business Details → Data Source → Template Selection → Template Editor → Done

New Flow:
Business Details → Data Source → Template Selection → Template Editor → Sample Preview (3 pages) → Done
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/campaigns/steps/SamplePagePreviewStep.tsx` | **Create** - New step showing 3 generated pages |
| `src/components/campaigns/CreateCampaignDialog.tsx` | Modify - Add step 6 for sample preview |

### Sample Preview Step UI

```tsx
// 3-column grid showing sample pages
<div className="grid grid-cols-3 gap-4">
  {samplePages.map((page, i) => (
    <div key={i} className="border rounded-lg overflow-hidden">
      <div className="bg-muted px-3 py-2 text-sm font-medium">
        Sample {i + 1}: {page.title}
      </div>
      <div className="h-[400px] overflow-auto">
        <PreviewCanvas
          sections={template.sections}
          styleConfig={styleConfig}
          dataValues={page.dataValues}
          generatedContent={page.sectionsContent}
          viewport="mobile"
          mode="preview"
        />
      </div>
    </div>
  ))}
</div>

<div className="flex justify-center gap-4 mt-6">
  <Button variant="outline" onClick={regenerateSamples}>
    <RefreshCw className="h-4 w-4 mr-2" /> Try Different Samples
  </Button>
  <Button onClick={approveAndFinalize}>
    <Check className="h-4 w-4 mr-2" /> Looks Good - Create Campaign
  </Button>
</div>
```

---

## Part 4: Image Generation Integration

### Strategy

1. **Template Phase**: AI generates image prompts as placeholders
   - Format: `image_prompt("A photo of a {{breed}} cat, professional studio shot")`
   
2. **Page Generation Phase**: Generate actual images
   - Use `google/gemini-2.5-flash-image` model
   - Store base64 in Supabase storage
   - Replace prompts with actual image URLs

### Files to Modify

| File | Action |
|------|--------|
| `supabase/functions/generate-template-ai/index.ts` | Add `image` section type and `image_prompt()` syntax to AI instructions |
| `supabase/functions/generate-campaign-content/index.ts` | Add image generation logic using Lovable AI |

### Template AI Update

```typescript
// In system prompt for template generation
content: `...
For image content, use the format: image_prompt("description of image for {{variable}}")

Section types available: hero, features, content, cta, faq, testimonials, gallery, benefits, process, pricing, image

For image sections:
- content.src: image_prompt("descriptive prompt for AI image generation")
- content.alt: Alt text for accessibility
...`
```

### Content Generation Update

```typescript
// In generate-campaign-content edge function
async function generateImage(prompt: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  
  const data = await response.json();
  const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  // Upload to Supabase storage and return URL
  // ...
  return publicUrl;
}

// Check for image_prompt patterns
function hasImagePrompt(content: string): boolean {
  return /image_prompt\(["'`][^"'`]+["'`]\)/.test(content);
}
```

---

## Part 5: Update AI Template Generator Prompt

Enhance the AI to generate more comprehensive templates with all section types.

### File: `supabase/functions/generate-template-ai/index.ts`

```typescript
content: `You are an expert landing page architect for SEO-optimized programmatic pages.

The template is for "${entity.name}" (URL: ${entity.urlPrefix}).
Variables: ${variableList}, {{company}}
${userInstructions}

SECTION TYPES AND THEIR CONTENT FIELDS:

1. hero: Main banner
   - headline: Main title with {{variable}}
   - subheadline: prompt("Write a compelling subtitle about {{variable}}")
   - cta_text: Button text
   
2. features: Feature grid
   - title: Section title
   - items: Array of feature strings (4-6 items)
   
3. content: Rich text block
   - title: Section heading
   - body: prompt("Write detailed content about {{variable}}")
   
4. pricing: Price display
   - title: "Pricing & Cost"
   - price: prompt("Estimate price range for {{variable}}")
   - description: Additional pricing notes
   - cta_text: "Get Quote"
   
5. faq: Q&A accordion
   - title: "Frequently Asked Questions"
   - items: Array of "Question|Answer" strings
   
6. pros_cons: Comparison table
   - title: "Pros & Cons"
   - pros: Array of positive points
   - cons: Array of negative points
   
7. testimonials: Customer quotes
   - title: "What Customers Say"
   - items: Array of testimonial strings
   
8. image: Image section
   - src: image_prompt("Description of image for {{variable}}")
   - alt: Alt text
   
9. cta: Call-to-action banner
   - headline: Compelling action text
   - subtext: Supporting message
   - button_text: Action button

RULES:
1. Generate 5-8 sections based on user instructions
2. Use {{variable}} for direct data substitution
3. Use prompt("...") for AI-generated text content
4. Use image_prompt("...") for AI-generated images
5. Make content SEO-focused and conversion-oriented`
```

---

## Implementation Order

| Phase | Tasks | Files |
|-------|-------|-------|
| **1. Simplify** | Remove singular/plural logic | `templateParser.ts`, `generate-campaign-content/index.ts` |
| **2. Render** | Add all section type renderers | `TemplatePreviewPanel.tsx`, `PreviewPageContent.tsx` |
| **3. Preview** | Add 3-page sample preview step | `SamplePagePreviewStep.tsx`, `CreateCampaignDialog.tsx` |
| **4. AI Prompt** | Update template AI with full section types | `generate-template-ai/index.ts` |
| **5. Images** | Add image generation to content generation | `generate-campaign-content/index.ts` |

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/templateParser.ts` | Modify | Remove singular/plural logic |
| `supabase/functions/generate-campaign-content/index.ts` | Modify | Remove singular/plural, add image generation |
| `supabase/functions/generate-template-ai/index.ts` | Modify | Enhanced section types and image prompts |
| `src/components/campaigns/steps/template-editor/TemplatePreviewPanel.tsx` | Modify | Add renderers for faq, pricing, pros_cons, testimonials, gallery, benefits, process |
| `src/components/preview/PreviewPageContent.tsx` | Modify | Add same renderers for public preview |
| `src/components/campaigns/steps/SamplePagePreviewStep.tsx` | Create | New step for 3-page preview during campaign creation |
| `src/components/campaigns/CreateCampaignDialog.tsx` | Modify | Add sample preview step to wizard |

---

## Cat Breeds Template Result

With these changes, the prompt:

> "Let's generate a template for cat breeds. Starting with a hero with a title and short description of the breed, an image of the cat breed, a feature list or cards highlighting the breed's features, price range. A table section for pros and cons of owning that breed, and an FAQ section. The cta's to be mainly for sending an inquiry form"

Will generate a template with:

| Section | Type | Content |
|---------|------|---------|
| **1. Hero** | `hero` | Headline: `{{breed}} Cat Breed Guide`, Subheadline: `prompt("Write introduction for {{breed}}")`, CTA: "Send Inquiry" |
| **2. Breed Image** | `image` | src: `image_prompt("Professional photo of {{breed}} cat, studio lighting")` |
| **3. Key Features** | `features` | Title: "{{breed}} Characteristics", Items: feature cards |
| **4. Pricing** | `pricing` | Title: "{{breed}} Price Range", Price: `prompt("Estimate price for {{breed}}")` |
| **5. Pros & Cons** | `pros_cons` | Title: "Is {{breed}} Right for You?", Pros/Cons arrays with prompts |
| **6. FAQ** | `faq` | Title: "{{breed}} FAQs", Items: common questions with prompted answers |
| **7. CTA** | `cta` | Headline: "Interested in {{breed}}?", Button: "Submit Inquiry" |

All sections will render properly in preview, and 3 sample pages (e.g., "Siamese", "Persian", "Maine Coon") will be generated for confirmation before finalizing the campaign.


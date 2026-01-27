
# Plan: Add Example Prompt Templates & Capability Analysis

## Part 1: Add Example Prompt Templates

### Implementation

**File to Modify**: `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx`

Add a set of clickable example templates above the prompt textarea that users can click to quickly fill common use cases.

### Example Templates to Include

| Template Name | Prompt Text |
|--------------|-------------|
| **Local Service** | "Create a professional service page with a hero showcasing the main service, features grid with benefits, service area coverage, testimonials from local customers, and a strong call-to-action for booking" |
| **Product/Pet Breeds** | "Generate a hero with title and description, an image section, feature cards highlighting key characteristics, a pricing/cost range section, pros and cons comparison, FAQ section, and inquiry CTAs" |
| **Directory Listing** | "Build a directory-style page with hero, key details in a grid format, contact information section, related services, and a contact form CTA" |
| **Comparison Page** | "Create a comparison page with hero, side-by-side feature comparison, detailed breakdown section, recommendations, and decision-driving CTAs" |
| **Location-Based** | "Design a location page with hero featuring the area name, local benefits grid, service coverage details, local testimonials, and contact CTA with address" |

### UI Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Guide the AI (optional)                                        │
│                                                                 │
│  Quick Templates:                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ 🏢 Local     │ │ 🐾 Product/  │ │ 📋 Directory │            │
│  │    Service   │ │    Breeds    │ │    Listing   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐                              │
│  │ ⚖️ Comparison│ │ 📍 Location  │                              │
│  │    Page      │ │    Based     │                              │
│  └──────────────┘ └──────────────┘                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Focus on trust and credibility, include FAQ section...     ││
│  └─────────────────────────────────────────────────────────────┘│
│  Describe what you want the template to emphasize or include.  │
└─────────────────────────────────────────────────────────────────┘
```

### Code Changes

```typescript
// New constant for example templates
const EXAMPLE_PROMPTS = [
  {
    id: "local-service",
    name: "Local Service",
    icon: "🏢",
    prompt: "Create a professional service page with a hero showcasing the main service, features grid with benefits, service area coverage, testimonials from local customers, and a strong call-to-action for booking or getting a quote",
  },
  {
    id: "product-breeds",
    name: "Product/Breeds",
    icon: "🐾",
    prompt: "Generate a hero with title and description, an image placeholder section, feature cards highlighting key characteristics, a pricing or cost range section, pros and cons comparison, FAQ section, and inquiry CTAs for contacting or submitting a form",
  },
  {
    id: "directory",
    name: "Directory Listing",
    icon: "📋",
    prompt: "Build a directory-style page with hero, key details presented in a grid format, contact information section, related services or items, and a contact form call-to-action",
  },
  {
    id: "comparison",
    name: "Comparison",
    icon: "⚖️",
    prompt: "Create a comparison page with hero, side-by-side feature comparison grid, detailed breakdown section with benefits, expert recommendations, and decision-driving CTAs",
  },
  {
    id: "location",
    name: "Location Page",
    icon: "📍",
    prompt: "Design a location-focused page with hero featuring the area name, local benefits and services grid, coverage details, local customer testimonials, and contact CTA with area-specific information",
  },
];

// In the "idle" state UI, add before the Textarea:
<div className="space-y-2">
  <Label className="text-sm font-medium">Quick Templates</Label>
  <div className="flex flex-wrap gap-2">
    {EXAMPLE_PROMPTS.map((example) => (
      <Button
        key={example.id}
        variant="outline"
        size="sm"
        className={cn(
          "text-xs",
          userPrompt === example.prompt && "border-primary bg-primary/5"
        )}
        onClick={() => setUserPrompt(example.prompt)}
      >
        <span className="mr-1">{example.icon}</span>
        {example.name}
      </Button>
    ))}
  </div>
</div>
```

---

## Part 2: Cat Breeds Template Analysis

### Your Example Template Request

> "Let's generate a template for cat breeds. Starting with a hero with a title and short description of the breed, an image of the cat breed, a feature list or cards highlighting the breed's features, price range. A table section for pros and cons of owning that breed, and an FAQ section. The cta's to be mainly for sending an inquiry form"

### Capability Assessment

| Section Requested | Current Support | Details |
|------------------|-----------------|---------|
| **Hero** (title + description) | ✅ Fully Supported | The `hero` section type renders headline, subheadline, and CTA button |
| **Image Section** | ⚠️ Partial | Images must be provided as URLs (uploaded externally). **No AI image generation** is integrated |
| **Feature Cards** | ✅ Fully Supported | The `features` section type renders a 2-column grid with checkmarks |
| **Price Range** | ⚠️ Workaround | Can use `content` section with prompt for price info, but no dedicated `pricing` renderer exists yet |
| **Pros/Cons Table** | ❌ Not Yet Supported | No `table`, `comparison`, or `pros_cons` section type exists. Would render as "Coming Soon" placeholder |
| **FAQ Section** | ❌ Placeholder Only | `faq` type exists in AI prompt options but renders as "Coming Soon" in preview |
| **Inquiry Form CTA** | ✅ Fully Supported | The `cta` section supports button text customization |

### Image Generation Status

**Current State**: No AI image generation is integrated into the pSEO builder.

**Technical Capability**: The Lovable AI gateway supports `google/gemini-2.5-flash-image` for image generation, but it is **not implemented** in:
- `generate-template-ai` edge function
- `generate-campaign-content` edge function
- Any template/page rendering component

**Future Enhancement Path**: Could add a dedicated image generation step that:
1. Takes breed name as input
2. Calls the image generation API
3. Stores the result in `imagesConfig.sectionImages`

### AI Prompts & Variable Accuracy

**How It Works**:
1. AI generates section content with `{{variable}}` and `prompt("...")` syntax
2. Variables like `{{breed}}` are replaced with actual data values
3. Prompt patterns trigger AI generation in `generate-campaign-content` edge function
4. The `templateParser.ts` handles case-insensitive matching and singular/plural forms

**Accuracy Assessment**: 
- ✅ **Variable replacement**: Highly accurate with smart singular/plural matching
- ✅ **Prompt generation**: Works well for text content
- ⚠️ **Complex structures**: Tables, lists, and structured data may need post-processing

### Achievability Summary

```
Cat Breeds Template Achievability: ~65%

✅ Achievable Now:
├─ Hero section with breed name + description
├─ Feature cards with breed characteristics
├─ Content sections with AI-generated text
├─ CTA for inquiry forms
└─ Variable substitution ({{breed}}, etc.)

⚠️ Needs Workarounds:
├─ Images (must upload manually or provide URLs)
└─ Pricing (use content section with prompt)

❌ Requires New Development:
├─ Pros/Cons table section type (~1-2 hours work)
├─ FAQ accordion section type (~1-2 hours work)
├─ AI image generation integration (~3-4 hours work)
└─ Dedicated pricing section type (~1 hour work)
```

---

## Part 3: Recommended Enhancements

To fully support the cat breeds template and similar use cases, consider adding:

### Priority 1: New Section Renderers

Add rendering support for section types already in the AI prompt:

1. **`faq`**: Accordion-style Q&A section
2. **`pricing`**: Price card or range display
3. **`benefits`**: Icon grid with benefit descriptions
4. **`testimonials`**: Quote cards with attribution
5. **`pros_cons`** (new): Two-column comparison table

### Priority 2: Image Generation

Integrate AI image generation using the Lovable AI gateway's `google/gemini-2.5-flash-image` model for:
- Breed/product hero images
- Section background images
- Icon/illustration generation

### Priority 3: Structured Content

Enable AI to generate structured data like:
- JSON arrays for feature lists
- Key-value pairs for specifications
- Comparison matrices

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx` | Modify | Add example prompt templates as clickable chips |

---

## Technical Implementation

The code change is straightforward:
1. Define `EXAMPLE_PROMPTS` constant array with 5 templates
2. Add a "Quick Templates" section with styled buttons
3. Each button click sets `userPrompt` to the template text
4. Visual indicator shows which template is currently selected

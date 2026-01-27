
# Plan: Fix Template Generation Error & Add User Prompting

## Problem Analysis

### Issue 1: Template Generation Error
From the edge function logs:
```
ERROR No tool call in response: {"error":{"message":"Internal Server Error","code":500},"user_id":"..."}
```

The AI gateway returned an error response, but the edge function code doesn't check if the response body contains an error before trying to parse tool calls. When the gateway fails, the response body is `{"error":...}` instead of `{"choices":[...]}`, causing line 156-158 to throw "No template generated".

**Root Cause**: Missing error handling for gateway internal errors in the response body.

### Issue 2: No Prompting Capability
The current `AITemplateGeneratorDialog` generates templates automatically based on business type and entity, with no way for users to provide specific instructions or context (e.g., "focus on trust signals", "include pricing section", "make it minimal").

---

## Solution

### Part 1: Fix Edge Function Error Handling

**File**: `supabase/functions/generate-template-ai/index.ts`

Add proper error handling after parsing the response:

```typescript
const data = await response.json();

// Check if the gateway returned an error in the response body
if (data.error) {
  console.error("AI Gateway error in response:", JSON.stringify(data.error));
  throw new Error(`AI generation failed: ${data.error.message || "Unknown error"}`);
}

const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
// ... rest of code
```

Also add retry logic with a fallback model if the primary fails.

### Part 2: Add User Prompt Input

**File**: `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx`

Add a `Textarea` for users to provide context before generating:

| Current Flow | New Flow |
|-------------|----------|
| Click "Generate" → AI generates immediately | Enter optional prompt → Click "Generate" → AI uses prompt for context |

**UI Changes**:
1. Add a prompt textarea in the "idle" state
2. Pass the prompt to the edge function
3. Include the user prompt in the AI system message

**Edge Function Changes**:
1. Accept a new `user_prompt` parameter
2. Include user instructions in the AI prompt

---

## File Changes

### 1. supabase/functions/generate-template-ai/index.ts

**Changes**:
- Add `user_prompt` to the request interface
- Check for error in response body before parsing tool calls
- Include user prompt in the AI system message
- Add retry logic with exponential backoff

```typescript
interface GenerateTemplateRequest {
  business_name: string;
  business_type: string;
  entity: { id: string; name: string; urlPrefix: string };
  variables: string[];
  existing_data: Record<string, string[]>;
  user_prompt?: string;  // NEW: Optional user instructions
}

// In the API call, update system message:
content: `You are an expert landing page architect...

${user_prompt ? `\nUSER INSTRUCTIONS: ${user_prompt}\n` : ""}

IMPORTANT RULES:
1. Generate 4-6 sections appropriate for this entity type
...`
```

**Error handling fix**:
```typescript
const data = await response.json();

// Check for error in response body
if (data.error) {
  console.error("AI Gateway returned error:", JSON.stringify(data.error));
  throw new Error(`AI service error: ${data.error.message || "Please try again"}`);
}

const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
```

### 2. src/components/campaigns/steps/AITemplateGeneratorDialog.tsx

**Changes**:
- Add state for user prompt: `const [userPrompt, setUserPrompt] = useState("")`
- Add Textarea UI in the "idle" state
- Pass `user_prompt` to the edge function call
- Show helpful placeholder text with examples

**New UI in "idle" state**:
```tsx
{generationStatus === "idle" && (
  <div className="space-y-6">
    {/* Prompt Input */}
    <div className="space-y-2">
      <Label htmlFor="ai-prompt">
        Guide the AI (optional)
      </Label>
      <Textarea
        id="ai-prompt"
        placeholder="e.g., Focus on trust and credibility, include FAQ section, keep it minimal and clean, emphasize local service areas..."
        value={userPrompt}
        onChange={(e) => setUserPrompt(e.target.value)}
        rows={3}
        className="resize-none"
      />
      <p className="text-xs text-muted-foreground">
        Describe what you want the template to emphasize or include.
      </p>
    </div>

    {/* Generate Button */}
    <div className="text-center">
      <Button onClick={generateTemplate} size="lg">
        <Sparkles className="h-4 w-4 mr-2" />
        Generate Template
      </Button>
    </div>
  </div>
)}
```

**Updated function call**:
```typescript
const response = await supabase.functions.invoke("generate-template-ai", {
  body: {
    business_name: formData.businessName || "Business",
    business_type: formData.businessType || "local",
    entity: currentEntity,
    variables: formData.dynamicColumns.map((c) => c.variableName),
    existing_data: formData.scratchData,
    user_prompt: userPrompt,  // NEW
  },
});
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/generate-template-ai/index.ts` | Modify | Add `user_prompt` parameter, fix error handling for gateway errors |
| `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx` | Modify | Add prompt textarea, pass to edge function |

---

## User Experience Flow

```text
1. User clicks "Create with AI" on template selection
   │
   ▼
2. Dialog opens with prompt input:
   ┌─────────────────────────────────────────────────────────┐
   │  Guide the AI (optional)                                │
   │  ┌─────────────────────────────────────────────────────┐│
   │  │ Focus on trust signals, include testimonials,       ││
   │  │ make it professional and clean...                   ││
   │  └─────────────────────────────────────────────────────┘│
   │                                                         │
   │            [Generate Template for Services]             │
   └─────────────────────────────────────────────────────────┘
   │
   ▼
3. AI generates template using:
   - Business type & name
   - Entity being configured
   - Available variables
   - User's custom instructions ← NEW
   │
   ▼
4. User reviews generated sections
   │
   ▼
5. Approve or Regenerate (can update prompt)
```

---

## Error Handling Improvements

The edge function will now:
1. Check `response.ok` for HTTP errors (already exists)
2. Check `data.error` for gateway errors in response body (NEW)
3. Provide clearer error messages to users
4. Log detailed error info for debugging

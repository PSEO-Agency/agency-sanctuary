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
  user_prompt?: string;
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

    const { 
      business_name, 
      business_type, 
      entity, 
      variables, 
      existing_data,
      user_prompt 
    }: GenerateTemplateRequest = await req.json();

    console.log("Generating template for entity:", entity.name, "business:", business_name);
    if (user_prompt) {
      console.log("User prompt provided:", user_prompt);
    }

    // Build context for AI
    const dataContext = Object.entries(existing_data || {})
      .map(([key, values]) => {
        const sampleValues = (values || []).slice(0, 3).join(", ");
        return `- ${key}: ${sampleValues}${values?.length > 3 ? "..." : ""}`;
      })
      .join("\n");

    const variableList = (variables || []).map((v) => `{{${v}}}`).join(", ");

    // Build user instructions section if provided
    const userInstructions = user_prompt 
      ? `\n\nUSER INSTRUCTIONS (follow these carefully):\n${user_prompt}\n`
      : "";

    const systemPrompt = `You are an expert landing page architect for SEO-optimized programmatic pages. Generate a template structure for a ${business_type} business called "${business_name}".

The template is for the "${entity.name}" entity type (URL prefix: ${entity.urlPrefix}).

IMPORTANT: You MUST use these specific variables in the template: ${variableList}, {{company}}
The user has explicitly selected these variables to be used. Make sure each selected variable appears in at least one section.

Data samples from the campaign:
${dataContext || "No data samples provided"}
${userInstructions}

SECTION TYPES AND THEIR CONTENT FIELDS:

1. hero: Main banner section
   - headline: Main title using {{variable}} (e.g., "Everything About {{breed}}")
   - subheadline: Use prompt("instruction") for AI-generated subtitle about {{variable}}
   - cta_text: Button text (e.g., "Get Quote", "Contact Us", "Learn More")

2. features: Feature grid with checkmarks
   - title: Section heading
   - items: Array of 4-6 feature strings (can include {{variable}})

3. content: Rich text block
   - title: Section heading
   - body: Use prompt("instruction about {{variable}}") for AI-generated content

4. pricing: Price display card
   - title: "Pricing" or "Cost Range"
   - price: Use prompt("estimate price range for {{variable}}") or static text
   - description: Additional pricing notes
   - features: Array of included features (optional)
   - cta_text: "Get Quote" or similar

5. faq: Q&A accordion (IMPORTANT: Use pipe | separator between question and answer)
   - title: "Frequently Asked Questions about {{variable}}"
   - items: Array of strings in format "Question about {{variable}}|prompt("answer about {{variable}}")"

6. pros_cons: Two-column comparison table
   - title: "Pros & Cons of {{variable}}"
   - pros: Array of positive points (use prompt for each or static text)
   - cons: Array of negative points (use prompt for each or static text)

7. testimonials: Customer quote cards
   - title: "What Customers Say"
   - items: Array of "Quote text|Author Name" strings

8. benefits: Icon/benefit grid
   - title: Section heading
   - items: Array of benefit strings

9. process: Step-by-step flow
   - title: "How It Works" or similar
   - steps: Array of step descriptions

10. gallery: Image grid placeholder
    - title: "Gallery" or similar
    - images: Array of image_prompt("description") strings

11. image: Single image section
    - src: Use image_prompt("detailed description for {{variable}}") for AI-generated image
    - alt: Alt text description

12. cta: Call-to-action banner
    - headline: Compelling action text (e.g., "Ready to Learn About {{variable}}?")
    - subtext: Supporting message
    - button_text: Action button text

SYNTAX RULES:
1. Use {{variable}} for direct data substitution from campaign data
2. Use prompt("instruction about {{variable}}") for AI-generated TEXT content
3. Use image_prompt("description of image for {{variable}}") for AI-generated IMAGES
4. For FAQ items, use format: "Question here|Answer or prompt here"
5. For testimonials, use format: "Quote text|Author Name"

IMPORTANT GUIDELINES:
- Generate 5-8 sections based on user instructions
- Start with a hero section
- End with a CTA section
- Include relevant sections based on the entity type and user prompt
- Make content SEO-focused and conversion-oriented
- Use the available variables naturally in content`;

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
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Generate a complete landing page template for "${entity.name}" pages. ${user_prompt ? `Focus on: ${user_prompt}` : `Include a hero section, relevant content sections, and a CTA section.`} Use the available variables: ${variableList}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_template",
              description: "Create a landing page template with multiple sections",
              parameters: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { 
                          type: "string",
                          description: "Unique section identifier (e.g., hero-1, features-1)" 
                        },
                        type: { 
                          type: "string", 
                          enum: ["hero", "features", "content", "cta", "faq", "testimonials", "gallery", "benefits", "process", "pricing", "pros_cons", "image"],
                          description: "Type of section"
                        },
                        name: { 
                          type: "string",
                          description: "Display name for the section"
                        },
                        content: {
                          type: "object",
                          description: "Key-value pairs of content fields. Use strings for simple values, arrays for list items. Values can include {{variable}} placeholders, prompt('...') for AI text, or image_prompt('...') for AI images."
                        },
                      },
                      required: ["id", "type", "name", "content"],
                    },
                  },
                },
                required: ["sections"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_template" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();

    // Check for error in response body (gateway returned error but with 200 status)
    if (data.error) {
      console.error("AI Gateway returned error in response body:", JSON.stringify(data.error));
      throw new Error(`AI generation failed: ${data.error.message || "Please try again"}`);
    }

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("No template generated from AI response");
    }

    let template;
    try {
      template = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Failed to parse template:", toolCall.function.arguments);
      throw new Error("Invalid template format from AI");
    }

    console.log("Generated template with", template.sections?.length || 0, "sections");

    return new Response(
      JSON.stringify({
        success: true,
        template: {
          sections: template.sections || [],
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
    console.error("Template generation error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

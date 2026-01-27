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
            content: `You are an expert landing page architect for SEO-optimized programmatic pages. Generate a template structure for a ${business_type} business called "${business_name}".

The template is for the "${entity.name}" entity type (URL prefix: ${entity.urlPrefix}).

Available template variables: ${variableList}, {{company}}

Data samples from the campaign:
${dataContext || "No data samples provided"}
${userInstructions}
IMPORTANT RULES:
1. Generate 4-6 sections appropriate for this entity type
2. Use variables in headlines and content with {{variable_name}} syntax
3. For dynamic AI-generated content, use the format: prompt("instruction for AI to generate content about {{variable}}")
4. Make content SEO-focused and conversion-oriented
5. Include clear calls-to-action

Section types available: hero, features, content, cta, faq, testimonials, gallery, benefits, process, pricing

Each section needs:
- id: unique identifier (e.g., "hero-1", "features-1")
- type: one of the section types above
- name: display name
- content: object with field names and their values (strings using variables or prompts)`,
          },
          {
            role: "user",
            content: `Generate a complete landing page template for "${entity.name}" pages. Include a hero section, at least 2 content sections, and a CTA section. Use the available variables: ${variableList}`,
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
                          description: "Unique section identifier" 
                        },
                        type: { 
                          type: "string", 
                          enum: ["hero", "features", "content", "cta", "faq", "testimonials", "gallery", "benefits", "process", "pricing"],
                          description: "Type of section"
                        },
                        name: { 
                          type: "string",
                          description: "Display name for the section"
                        },
                        content: {
                          type: "object",
                          additionalProperties: { type: "string" },
                          description: "Key-value pairs of content fields with their values using variables or prompts"
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

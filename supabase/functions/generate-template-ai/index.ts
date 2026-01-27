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

// Get default content for a section type based on available variables
function getDefaultContent(
  type: string, 
  variables: string[],
  businessName: string
): Record<string, any> {
  const mainVar = variables[0] || "item";
  
  const defaults: Record<string, Record<string, any>> = {
    hero: {
      headline: `{{${mainVar}}} - ${businessName}`,
      subheadline: `prompt("Write an engaging 1-2 sentence introduction about {{${mainVar}}} for ${businessName}")`,
      cta_text: "Learn More"
    },
    features: {
      title: `Key Features of {{${mainVar}}}`,
      items: [
        `prompt("Describe feature 1 of {{${mainVar}}}")`,
        `prompt("Describe feature 2 of {{${mainVar}}}")`,
        `prompt("Describe feature 3 of {{${mainVar}}}")`,
      ]
    },
    content: {
      title: `About {{${mainVar}}}`,
      body: `prompt("Write detailed, informative content about {{${mainVar}}} for ${businessName}. Include key information that visitors would want to know.")`
    },
    faq: {
      title: `Frequently Asked Questions about {{${mainVar}}}`,
      items: [
        `What is {{${mainVar}}}?|prompt("Provide a comprehensive answer about what {{${mainVar}}} is and why it matters")`,
        `Why choose {{${mainVar}}}?|prompt("Explain the key benefits and reasons to choose {{${mainVar}}}")`
      ]
    },
    pros_cons: {
      title: `Pros and Cons of {{${mainVar}}}`,
      pros: [
        `prompt("List advantage 1 of {{${mainVar}}}")`,
        `prompt("List advantage 2 of {{${mainVar}}}")`,
        `prompt("List advantage 3 of {{${mainVar}}}")`
      ],
      cons: [
        `prompt("List potential drawback 1 of {{${mainVar}}}")`,
        `prompt("List potential drawback 2 of {{${mainVar}}}")`
      ]
    },
    pricing: {
      title: `{{${mainVar}}} Pricing`,
      price: `prompt("Estimate a typical price range for {{${mainVar}}}")`,
      description: `prompt("Describe what's included and any pricing factors for {{${mainVar}}}")`,
      cta_text: "Get Quote"
    },
    testimonials: {
      title: "What Our Customers Say",
      items: [
        `prompt("Write a testimonial from a satisfied customer about {{${mainVar}}}")|Happy Customer`,
        `prompt("Write another positive customer review about {{${mainVar}}}")|Verified Buyer`
      ]
    },
    benefits: {
      title: `Benefits of {{${mainVar}}}`,
      items: [
        `prompt("Describe key benefit 1 of {{${mainVar}}}")`,
        `prompt("Describe key benefit 2 of {{${mainVar}}}")`,
        `prompt("Describe key benefit 3 of {{${mainVar}}}")`
      ]
    },
    process: {
      title: "How It Works",
      steps: [
        `prompt("Describe step 1 of the process for {{${mainVar}}}")`,
        `prompt("Describe step 2 of the process for {{${mainVar}}}")`,
        `prompt("Describe step 3 of the process for {{${mainVar}}}")`
      ]
    },
    gallery: {
      title: `{{${mainVar}}} Gallery`,
      images: [
        `image_prompt("High quality professional photo of {{${mainVar}}}")`,
        `image_prompt("Detailed view of {{${mainVar}}}")`
      ]
    },
    image: {
      src: `image_prompt("High quality professional photo of {{${mainVar}}}")`,
      alt: `{{${mainVar}}} image`
    },
    cta: {
      headline: `Ready to Learn About {{${mainVar}}}?`,
      subtext: `Contact ${businessName} today for more information`,
      button_text: "Contact Us"
    }
  };
  
  return defaults[type] || { 
    title: `{{${mainVar}}}`,
    body: `prompt("Write informative content about {{${mainVar}}}")`
  };
}

// Ensure all sections have populated content
function ensureContentPopulated(
  sections: any[], 
  variables: string[],
  businessName: string
): any[] {
  return sections.map(section => {
    if (!section.content || Object.keys(section.content).length === 0) {
      console.log(`Section ${section.id} (${section.type}) has empty content, adding defaults`);
      section.content = getDefaultContent(section.type, variables, businessName);
    }
    return section;
  });
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
    const mainVariable = variables?.[0] || "item";

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

=== CRITICAL: CONTENT STRUCTURE EXAMPLES ===

EVERY section MUST have fully populated content fields with real values. NEVER return empty content objects.

EXAMPLE HERO SECTION (COPY THIS STRUCTURE):
{
  "id": "hero-${entity.id}",
  "type": "hero",
  "name": "Hero Banner",
  "content": {
    "headline": "Everything About {{${mainVariable}}}",
    "subheadline": "prompt(\\"Write a compelling 1-2 sentence introduction about {{${mainVariable}}} for ${business_name}\\")",
    "cta_text": "Get a Quote"
  }
}

EXAMPLE FEATURES SECTION:
{
  "id": "features-${entity.id}",
  "type": "features",
  "name": "Key Features",
  "content": {
    "title": "Why Choose {{${mainVariable}}}",
    "items": [
      "prompt(\\"Describe feature 1 of {{${mainVariable}}}\\")",
      "prompt(\\"Describe feature 2 of {{${mainVariable}}}\\")",
      "prompt(\\"Describe feature 3 of {{${mainVariable}}}\\")",
      "prompt(\\"Describe feature 4 of {{${mainVariable}}}\\")"
    ]
  }
}

EXAMPLE CONTENT SECTION:
{
  "id": "content-${entity.id}",
  "type": "content",
  "name": "About Section",
  "content": {
    "title": "About {{${mainVariable}}}",
    "body": "prompt(\\"Write detailed, informative content about {{${mainVariable}}} for ${business_name}. Include key information, benefits, and what makes it special.\\")"
  }
}

EXAMPLE FAQ SECTION (use pipe | separator):
{
  "id": "faq-${entity.id}",
  "type": "faq",
  "name": "Frequently Asked Questions",
  "content": {
    "title": "Common Questions About {{${mainVariable}}}",
    "items": [
      "What is {{${mainVariable}}}?|prompt(\\"Provide a detailed answer about what {{${mainVariable}}} is and its key characteristics\\")",
      "How much does {{${mainVariable}}} cost?|prompt(\\"Provide pricing information and factors that affect the cost of {{${mainVariable}}}\\")",
      "Why should I choose {{${mainVariable}}}?|prompt(\\"Explain the key benefits and reasons to choose {{${mainVariable}}}\\")"
    ]
  }
}

EXAMPLE PROS_CONS SECTION:
{
  "id": "pros-cons-${entity.id}",
  "type": "pros_cons",
  "name": "Pros and Cons",
  "content": {
    "title": "Is {{${mainVariable}}} Right for You?",
    "pros": [
      "prompt(\\"List advantage 1 of {{${mainVariable}}}\\")",
      "prompt(\\"List advantage 2 of {{${mainVariable}}}\\")",
      "prompt(\\"List advantage 3 of {{${mainVariable}}}\\")"
    ],
    "cons": [
      "prompt(\\"List potential drawback 1 of {{${mainVariable}}}\\")",
      "prompt(\\"List potential drawback 2 of {{${mainVariable}}}\\")"
    ]
  }
}

EXAMPLE PRICING SECTION:
{
  "id": "pricing-${entity.id}",
  "type": "pricing",
  "name": "Pricing Information",
  "content": {
    "title": "{{${mainVariable}}} Pricing",
    "price": "prompt(\\"Estimate a typical price range for {{${mainVariable}}}\\")",
    "description": "prompt(\\"Describe what's included and any factors that affect pricing\\")",
    "cta_text": "Get Quote"
  }
}

EXAMPLE IMAGE SECTION:
{
  "id": "image-${entity.id}",
  "type": "image",
  "name": "Featured Image",
  "content": {
    "src": "image_prompt(\\"High quality professional photo of {{${mainVariable}}}\\")",
    "alt": "{{${mainVariable}}} image"
  }
}

EXAMPLE CTA SECTION:
{
  "id": "cta-${entity.id}",
  "type": "cta",
  "name": "Call to Action",
  "content": {
    "headline": "Ready to Learn About {{${mainVariable}}}?",
    "subtext": "Contact ${business_name} today for more information",
    "button_text": "Contact Us"
  }
}

EXAMPLE TESTIMONIALS SECTION:
{
  "id": "testimonials-${entity.id}",
  "type": "testimonials",
  "name": "Customer Reviews",
  "content": {
    "title": "What Our Customers Say",
    "items": [
      "prompt(\\"Write a testimonial from a satisfied customer about {{${mainVariable}}}\\")|Happy Customer",
      "prompt(\\"Write another positive review about {{${mainVariable}}}\\")|Verified Buyer"
    ]
  }
}

EXAMPLE BENEFITS SECTION:
{
  "id": "benefits-${entity.id}",
  "type": "benefits",
  "name": "Key Benefits",
  "content": {
    "title": "Benefits of {{${mainVariable}}}",
    "items": [
      "prompt(\\"Describe key benefit 1 of {{${mainVariable}}}\\")",
      "prompt(\\"Describe key benefit 2 of {{${mainVariable}}}\\")",
      "prompt(\\"Describe key benefit 3 of {{${mainVariable}}}\\")"
    ]
  }
}

EXAMPLE PROCESS SECTION:
{
  "id": "process-${entity.id}",
  "type": "process",
  "name": "How It Works",
  "content": {
    "title": "How It Works",
    "steps": [
      "prompt(\\"Describe step 1 of the process for {{${mainVariable}}}\\")",
      "prompt(\\"Describe step 2 of the process\\")",
      "prompt(\\"Describe step 3 of the process\\")"
    ]
  }
}

EXAMPLE GALLERY SECTION:
{
  "id": "gallery-${entity.id}",
  "type": "gallery",
  "name": "Photo Gallery",
  "content": {
    "title": "{{${mainVariable}}} Gallery",
    "images": [
      "image_prompt(\\"Professional photo of {{${mainVariable}}} from front view\\")",
      "image_prompt(\\"Detailed close-up of {{${mainVariable}}}\\")"
    ]
  }
}

=== SYNTAX RULES ===
1. Use {{variable}} for direct data substitution from campaign data
2. Use prompt("instruction about {{variable}}") for AI-generated TEXT content - ALWAYS include instructions inside
3. Use image_prompt("description of image for {{variable}}") for AI-generated IMAGES
4. For FAQ items, use format: "Question here|Answer or prompt here"
5. For testimonials, use format: "Quote text|Author Name"

=== SECTION CONTENT REQUIREMENTS ===
- hero: MUST have headline, subheadline, cta_text
- features: MUST have title, items (array of strings)
- content: MUST have title, body
- faq: MUST have title, items (array of "question|answer" strings)
- pros_cons: MUST have title, pros (array), cons (array)
- pricing: MUST have title, price, description, cta_text
- testimonials: MUST have title, items (array of "quote|author" strings)
- benefits: MUST have title, items (array)
- process: MUST have title, steps (array)
- gallery: MUST have title, images (array of image_prompt strings)
- image: MUST have src (image_prompt), alt
- cta: MUST have headline, subtext, button_text

CRITICAL RULES:
- NEVER return content: {} - this is INVALID and will be rejected
- EVERY section MUST have ALL required fields for its type
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
            content: `Generate a complete landing page template for "${entity.name}" pages. ${user_prompt ? `Focus on: ${user_prompt}` : `Include a hero section, relevant content sections, and a CTA section.`} Use the available variables: ${variableList}. 

IMPORTANT: Make sure EVERY section has fully populated content fields following the examples I provided. Do not return any section with empty content.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_template",
              description: "Create a landing page template with multiple sections. Each section MUST have all required content fields populated.",
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
                          description: "REQUIRED: Content fields for the section. Must include all required fields for the section type. Use {{variable}} for data, prompt('...') for AI text, image_prompt('...') for AI images.",
                          additionalProperties: true
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

    // Post-process: Ensure all sections have content
    const processedSections = ensureContentPopulated(
      template.sections || [],
      variables || [],
      business_name
    );

    console.log("Generated template with", processedSections.length, "sections");

    // Log section content for debugging
    processedSections.forEach(section => {
      const contentKeys = Object.keys(section.content || {});
      console.log(`Section ${section.id} (${section.type}): ${contentKeys.length} content fields - ${contentKeys.join(', ')}`);
    });

    return new Response(
      JSON.stringify({
        success: true,
        template: {
          sections: processedSections,
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

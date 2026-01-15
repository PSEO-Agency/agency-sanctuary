import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Field-level content structure
interface FieldContent {
  original: string;
  rendered: string;
  generated?: string;
  isPrompt: boolean;
}

interface TemplateSection {
  id: string;
  type: string;
  name: string;
  content: Record<string, string | string[]>;
}

interface GenerationRequest {
  page_id: string;
  business_name: string;
  business_type: string;
  data_values: Record<string, string>;
  template_sections: TemplateSection[];
  tone_of_voice?: string;
}

interface GeneratedSection {
  id: string;
  name: string;
  type: string;
  fields: Record<string, FieldContent>;
  generated: boolean;
}

// Parse static placeholders - case insensitive with singular/plural aliasing
function parseStaticPlaceholders(template: string, data: Record<string, string>): string {
  // Create lowercase key map with singular/plural aliases
  const lowercaseData: Record<string, string> = {};

  const toSingular = (k: string): string => {
    if (k.endsWith("ies") && k.length > 3) return k.slice(0, -3) + "y"; // cities -> city
    if (k.endsWith("ses") && k.length > 3) return k.slice(0, -2); // addresses -> address
    if (k.endsWith("s") && !k.endsWith("ss") && k.length > 1) return k.slice(0, -1); // services -> service
    return k;
  };

  const toPlural = (k: string): string => {
    if (k.endsWith("y") && k.length > 1) return k.slice(0, -1) + "ies"; // city -> cities
    if (k.endsWith("s")) return k;
    return k + "s";
  };

  const addIfMissing = (k: string, value: string) => {
    const key = k.toLowerCase();
    if (lowercaseData[key] === undefined) lowercaseData[key] = value;
  };

  Object.entries(data).forEach(([key, value]) => {
    const k = key.toLowerCase();
    addIfMissing(k, value);
    addIfMissing(toSingular(k), value);
    addIfMissing(toPlural(k), value);
  });

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return lowercaseData[String(key).toLowerCase()] || match;
  });
}

// Extract prompt patterns from content
function extractPrompt(content: string): string | null {
  const match = content.match(/prompt\(["'`]([^"'`]+)["'`]\)/);
  return match ? match[1] : null;
}

// Check if content contains a prompt pattern
function hasPrompt(content: string): boolean {
  return /prompt\(["'`][^"'`]+["'`]\)/.test(content);
}

// Generate content using Lovable AI Gateway
async function generateWithAI(
  prompt: string,
  context: {
    businessName: string;
    businessType: string;
    toneOfVoice: string;
    dataValues: Record<string, string>;
  }
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  // Build the data context for the AI
  const dataContext = Object.entries(context.dataValues)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  const systemPrompt = `You are an expert SEO copywriter creating content for ${context.businessName}, a ${context.businessType} business.

Tone of voice: ${context.toneOfVoice || "Professional, friendly, and trustworthy"}

Business data:
${dataContext}

Guidelines:
- Write compelling, SEO-optimized content
- Be specific and use the provided data values naturally
- Keep content concise but impactful
- Do not use placeholder text or brackets like {{variable}}
- Write in the same language as the data values provided
- Do NOT include any markdown formatting, just plain text`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to continue.");
    }
    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);
    throw new Error(`AI generation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content generated from AI");
  }

  return content.trim();
}

// Generate SEO metadata
async function generateSEOMetadata(
  pageTitle: string,
  context: {
    businessName: string;
    businessType: string;
    dataValues: Record<string, string>;
  }
): Promise<{ meta_title: string; meta_description: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const dataContext = Object.entries(context.dataValues)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

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
          content: `You are an SEO expert. Generate metadata for a landing page.

Business: ${context.businessName}
Type: ${context.businessType}
Page data:
${dataContext}`,
        },
        {
          role: "user",
          content: `Generate SEO metadata for a page titled "${pageTitle}".`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_seo_metadata",
            description: "Generate SEO metadata for a landing page",
            parameters: {
              type: "object",
              properties: {
                meta_title: {
                  type: "string",
                  description: "SEO meta title, max 60 characters, include main keyword",
                },
                meta_description: {
                  type: "string",
                  description: "SEO meta description, max 160 characters, compelling and action-oriented",
                },
              },
              required: ["meta_title", "meta_description"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_seo_metadata" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to continue.");
    }
    throw new Error(`SEO generation failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall?.function?.arguments) {
    // Fallback to simple generation
    return {
      meta_title: pageTitle.substring(0, 60),
      meta_description: `Learn more about ${pageTitle}. ${context.businessName} offers the best solutions.`.substring(0, 160),
    };
  }

  const args = JSON.parse(toolCall.function.arguments);
  return {
    meta_title: args.meta_title || pageTitle.substring(0, 60),
    meta_description: args.meta_description || "",
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      page_id,
      business_name,
      business_type,
      data_values,
      template_sections,
      tone_of_voice,
    }: GenerationRequest = await req.json();

    console.log("Generating content for page:", page_id);
    console.log("Business:", business_name, business_type);
    console.log("Data values:", data_values);

    // Fetch the page to get the title
    const { data: page, error: pageError } = await supabase
      .from("campaign_pages")
      .select("title, meta_title, meta_description")
      .eq("id", page_id)
      .single();

    if (pageError || !page) {
      console.error("Error fetching page:", pageError);
      return new Response(
        JSON.stringify({ error: "Page not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Include company name in data values
    const enrichedDataValues = {
      company: business_name,
      business: business_name,
      ...data_values,
    };

    // Generate SEO metadata if not already set
    let seoMetadata: { meta_title: string; meta_description: string };
    if (!page.meta_title || !page.meta_description) {
      console.log("Generating SEO metadata...");
      seoMetadata = await generateSEOMetadata(page.title, {
        businessName: business_name,
        businessType: business_type,
        dataValues: enrichedDataValues,
      });
    } else {
      seoMetadata = {
        meta_title: page.meta_title,
        meta_description: page.meta_description,
      };
    }

    // Process each template section and generate content per field
    const generatedSections: GeneratedSection[] = [];

    for (const section of template_sections) {
      console.log(`Processing section: ${section.id} (${section.type})`);
      
      const fields: Record<string, FieldContent> = {};

      for (const [key, value] of Object.entries(section.content)) {
        if (typeof value === "string") {
          const isPrompt = hasPrompt(value);
          let generated: string | undefined;

          if (isPrompt) {
            const rawPrompt = extractPrompt(value);
            if (rawPrompt) {
              const processedPrompt = parseStaticPlaceholders(rawPrompt, enrichedDataValues);
              console.log(`Generating AI content for ${section.id}.${key}:`, processedPrompt.substring(0, 100));
              
              try {
                generated = await generateWithAI(processedPrompt, {
                  businessName: business_name,
                  businessType: business_type,
                  toneOfVoice: tone_of_voice || "Professional and friendly",
                  dataValues: enrichedDataValues,
                });
              } catch (err) {
                console.error(`Failed to generate content for ${section.id}.${key}:`, err);
                generated = `[Generation failed - please retry]`;
              }
            }
          }

          fields[key] = {
            original: value,
            rendered: parseStaticPlaceholders(value, enrichedDataValues),
            generated: generated,
            isPrompt: isPrompt,
          };
        } else if (Array.isArray(value)) {
          // Handle arrays (like feature items) - replace placeholders in each item
          const renderedItems = value.map(item => 
            parseStaticPlaceholders(item, enrichedDataValues)
          );
          
          fields[key] = {
            original: JSON.stringify(value),
            rendered: JSON.stringify(renderedItems),
            isPrompt: false,
          };
        }
      }

      generatedSections.push({
        id: section.id,
        name: section.name,
        type: section.type,
        fields: fields,
        generated: true,
      });
    }

    console.log("Generated", generatedSections.length, "sections");

    // Update the page with generated content
    const { error: updateError } = await supabase
      .from("campaign_pages")
      .update({
        meta_title: seoMetadata.meta_title,
        meta_description: seoMetadata.meta_description,
        sections_content: generatedSections,
        status: "generated",
        updated_at: new Date().toISOString(),
      })
      .eq("id", page_id);

    if (updateError) {
      console.error("Error updating page:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save generated content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Content generation complete for page:", page_id);

    return new Response(
      JSON.stringify({
        success: true,
        page_id,
        meta_title: seoMetadata.meta_title,
        meta_description: seoMetadata.meta_description,
        sections: generatedSections,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-campaign-content:", error);
    
    // Handle specific error types
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const statusCode = errorMessage.includes("Rate limit") ? 429 
      : errorMessage.includes("credits") ? 402 
      : 500;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
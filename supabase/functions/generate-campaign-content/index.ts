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
  is_sample?: boolean; // Flag for sample preview mode
}

interface GeneratedSection {
  id: string;
  name: string;
  type: string;
  fields: Record<string, FieldContent>;
  generated: boolean;
}

// Parse static placeholders - case insensitive matching
function parseStaticPlaceholders(template: string, data: Record<string, string>): string {
  // Create lowercase key map for case-insensitive lookup
  const lowercaseData: Record<string, string> = {};

  Object.entries(data).forEach(([key, value]) => {
    lowercaseData[key.toLowerCase()] = value;
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

// Extract image_prompt patterns from content
function extractImagePrompt(content: string): string | null {
  const match = content.match(/image_prompt\(["'`]([^"'`]+)["'`]\)/);
  return match ? match[1] : null;
}

// Check if content contains an image_prompt pattern
function hasImagePrompt(content: string): boolean {
  return /image_prompt\(["'`][^"'`]+["'`]\)/.test(content);
}

// Generate image using Lovable AI Gateway
async function generateImage(
  prompt: string,
  supabase: any
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  console.log("Generating image for prompt:", prompt.substring(0, 100));

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

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded for image generation");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted for image generation");
    }
    const errorText = await response.text();
    console.error("Image generation error:", response.status, errorText);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!imageBase64) {
    console.log("No image generated, returning placeholder");
    return `[Image: ${prompt.substring(0, 50)}...]`;
  }

  // For now, return the base64 data URL directly
  // In production, you'd upload this to Supabase storage and return the public URL
  // But base64 can be very large, so we'll just return a placeholder for now
  // to avoid storing huge strings in the database
  console.log("Image generated successfully");
  
  // Extract just enough of the base64 to identify it was generated
  // In production, upload to storage bucket instead
  return imageBase64;
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
      is_sample,
    }: GenerationRequest = await req.json();

    console.log("Generating content for page:", page_id, is_sample ? "(sample mode)" : "");
    console.log("Business:", business_name, business_type);
    console.log("Data values:", data_values);

    // Include company name in data values
    const enrichedDataValues = {
      company: business_name,
      business: business_name,
      ...data_values,
    };

    let pageTitle = "Sample Page";
    let seoMetadata: { meta_title: string; meta_description: string } = {
      meta_title: "",
      meta_description: "",
    };

    // For real pages (not samples), fetch and update the database
    if (!is_sample && !page_id.startsWith("sample-")) {
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

      pageTitle = page.title;

      // Generate SEO metadata if not already set
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
    } else {
      // For sample pages, generate SEO metadata based on the first title pattern
      seoMetadata = {
        meta_title: `Sample - ${business_name}`,
        meta_description: `Sample page for ${business_name}`,
      };
    }

    // Process each template section and generate content per field
    const generatedSections: GeneratedSection[] = [];

    for (const section of template_sections) {
      console.log(`Processing section: ${section.id} (${section.type})`);
      
      const fields: Record<string, FieldContent> = {};

      for (const [key, value] of Object.entries(section.content)) {
        if (typeof value === "string") {
          const isTextPrompt = hasPrompt(value);
          const isImagePrompt = hasImagePrompt(value);
          let generated: string | undefined;

          if (isImagePrompt) {
            // Handle image generation
            const rawPrompt = extractImagePrompt(value);
            if (rawPrompt) {
              const processedPrompt = parseStaticPlaceholders(rawPrompt, enrichedDataValues);
              console.log(`Generating image for ${section.id}.${key}:`, processedPrompt.substring(0, 100));
              
              try {
                // For sample mode, skip actual image generation to save credits
                if (is_sample) {
                  generated = `[Sample Image: ${processedPrompt.substring(0, 60)}...]`;
                } else {
                  generated = await generateImage(processedPrompt, supabase);
                }
              } catch (err) {
                console.error(`Failed to generate image for ${section.id}.${key}:`, err);
                generated = `[Image generation failed]`;
              }
            }
          } else if (isTextPrompt) {
            // Handle text generation
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
            isPrompt: isTextPrompt || isImagePrompt,
          };
        } else if (Array.isArray(value)) {
          // Handle arrays (like feature items, FAQ items, pros/cons)
          const processedItems: string[] = [];
          
          for (const item of value) {
            if (hasPrompt(item)) {
              // Item contains a prompt - generate content
              const rawPrompt = extractPrompt(item);
              if (rawPrompt) {
                const processedPrompt = parseStaticPlaceholders(rawPrompt, enrichedDataValues);
                try {
                  const generatedItem = await generateWithAI(processedPrompt, {
                    businessName: business_name,
                    businessType: business_type,
                    toneOfVoice: tone_of_voice || "Professional and friendly",
                    dataValues: enrichedDataValues,
                  });
                  // For FAQ items with format "Question|prompt(...)", preserve the question
                  if (item.includes('|')) {
                    const questionPart = item.split('|')[0].trim();
                    const resolvedQuestion = parseStaticPlaceholders(questionPart, enrichedDataValues);
                    processedItems.push(`${resolvedQuestion}|${generatedItem}`);
                  } else {
                    processedItems.push(generatedItem);
                  }
                } catch (err) {
                  console.error(`Failed to generate array item:`, err);
                  processedItems.push(parseStaticPlaceholders(item, enrichedDataValues));
                }
              }
            } else {
              // Simple placeholder replacement
              processedItems.push(parseStaticPlaceholders(item, enrichedDataValues));
            }
          }
          
          fields[key] = {
            original: JSON.stringify(value),
            rendered: JSON.stringify(processedItems),
            isPrompt: value.some(item => hasPrompt(item)),
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

    // For real pages, update the database
    if (!is_sample && !page_id.startsWith("sample-")) {
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
    }

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

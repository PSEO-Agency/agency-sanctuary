import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { column_name, business_type, business_name, prompt, existing_items, max_items } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingItemsList = Array.isArray(existing_items) && existing_items.length > 0
      ? `\nExisting items (avoid duplicates): ${existing_items.join(", ")}`
      : "";

    const systemPrompt = `You are a data assistant helping generate items for a ${business_type || "business"} campaign.
${business_name ? `Business: ${business_name}` : ""}
Generate a list of ${column_name || "items"} based on the user's criteria.${existingItemsList}
Return exactly the items requested as a list, no explanations or additional text.
Each item should be concise (1-4 words typically).`;

    console.log("Generating items with prompt:", prompt);
    console.log("System prompt:", systemPrompt);

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
          { role: "user", content: `Generate ${max_items || 20} ${column_name || "items"}: ${prompt}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_items",
              description: "Return a list of generated items",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of generated items"
                  }
                },
                required: ["items"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_items" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data));

    // Extract items from tool call response
    let items: string[] = [];
    
    const toolCalls = data.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      if (toolCall.function?.arguments) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          if (Array.isArray(args.items)) {
            items = args.items.map((item: string) => item.trim()).filter((item: string) => item.length > 0);
          }
        } catch (parseError) {
          console.error("Error parsing tool call arguments:", parseError);
        }
      }
    }

    // Fallback: try to parse from content if tool call didn't work
    if (items.length === 0) {
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        // Try to extract items from the content
        const lines = content.split(/\n/).map((line: string) => line.trim());
        items = lines
          .filter((line: string) => line.length > 0 && !line.startsWith("#"))
          .map((line: string) => line.replace(/^[-*\d.\)]+\s*/, "").trim())
          .filter((item: string) => item.length > 0 && item.length < 100);
      }
    }

    console.log("Generated items:", items);

    return new Response(
      JSON.stringify({ items }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-column-items:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

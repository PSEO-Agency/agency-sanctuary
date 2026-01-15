import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, pageId, currentContent } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context about the current page
    const pageContext = currentContent
      ? `
Current page content:
- Sections: ${JSON.stringify(currentContent.sections, null, 2)}
- Data values (variables): ${JSON.stringify(currentContent.dataValues, null, 2)}
`
      : "";

    const systemPrompt = `You are an AI assistant that helps users edit their website pages through natural language.
You can help with:
1. Rewriting headlines, subheadlines, and body text
2. Suggesting improvements to call-to-action buttons
3. Changing the tone or style of content
4. Providing copywriting suggestions

${pageContext}

When the user asks you to make a change, respond conversationally and explain what you're doing.
If you can provide the actual updated content, include it in a JSON code block with this format:
\`\`\`json
{
  "action": "update_content",
  "changes": {
    "sectionId": "section-id-here",
    "field": "field-name-here",
    "newValue": "the new content here"
  }
}
\`\`\`

Be helpful, creative, and provide high-quality copywriting suggestions. Keep responses concise but informative.
If the user's request is unclear, ask clarifying questions.`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI website editor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
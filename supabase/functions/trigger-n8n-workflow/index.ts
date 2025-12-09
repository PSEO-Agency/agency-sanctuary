import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, articleId, action, data } = await req.json();
    
    if (!projectId || !articleId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: projectId, articleId, action' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Triggering n8n workflow for article ${articleId}, action: ${action}`);

    // For now, we'll use a placeholder webhook URL
    // In production, this would come from project settings or environment variables
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    
    if (!n8nWebhookUrl) {
      console.log('N8N_WEBHOOK_URL not configured - skipping webhook trigger');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'n8n webhook URL not configured. Article created but workflow not triggered.',
          skipped: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the webhook payload
    const payload = {
      projectId,
      articleId,
      action, // 'start_pipeline', 'regenerate_outline', 'regenerate_content', 'approve', 'reject'
      timestamp: new Date().toISOString(),
      data: data || {},
    };

    console.log('Sending webhook payload:', JSON.stringify(payload));

    // Send the webhook
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n webhook error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Webhook failed: ${response.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Webhook triggered successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Workflow triggered successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error triggering n8n workflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

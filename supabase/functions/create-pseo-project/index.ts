import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name } = await req.json();
    
    if (!name) {
      console.error('Missing project name');
      return new Response(
        JSON.stringify({ error: 'Project name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('PSEO_API_KEY');
    if (!apiKey) {
      console.error('PSEO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'PSEO API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating PSEO project:', name);

    const response = await fetch('https://n8n.virtualmin.programmaticseobuilder.com/webhook/pb/v1/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PSEO-API-KEY': apiKey,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PSEO API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `PSEO API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('PSEO project created:', data);

    return new Response(
      JSON.stringify({ 
        success: true,
        id: data.id,
        name: data.name,
        schema: data.schema
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating PSEO project:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

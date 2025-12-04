import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AirtableTable {
  id: string;
  name: string;
  description?: string;
}

interface AirtableBaseResponse {
  tables: AirtableTable[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseId } = await req.json();
    
    if (!baseId) {
      return new Response(
        JSON.stringify({ error: 'Base ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('AIRTABLE_API_KEY');
    
    if (!apiKey) {
      console.error('AIRTABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Airtable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing Airtable connection for base: ${baseId}`);

    // Fetch base schema to get table names
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Airtable API error: ${response.status}`,
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: AirtableBaseResponse = await response.json();
    console.log(`Successfully connected to Airtable base. Found ${data.tables.length} tables.`);

    return new Response(
      JSON.stringify({ 
        success: true,
        tables: data.tables.map(t => ({ id: t.id, name: t.name, description: t.description }))
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error testing Airtable connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

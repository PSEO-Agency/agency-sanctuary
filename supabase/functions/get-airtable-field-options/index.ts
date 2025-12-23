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
    const { baseId, tableName } = await req.json();
    
    if (!baseId) {
      return new Response(
        JSON.stringify({ error: 'baseId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('AIRTABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AIRTABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching field options from Airtable base: ${baseId}, table: ${tableName || 'Projects'}`);

    // Fetch the schema
    const schemaResponse = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!schemaResponse.ok) {
      const errorText = await schemaResponse.text();
      console.error('Failed to fetch schema:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Airtable schema', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const schemaData = await schemaResponse.json();
    const targetTable = schemaData.tables.find((t: any) => 
      t.name.toLowerCase() === (tableName || 'projects').toLowerCase()
    );

    if (!targetTable) {
      return new Response(
        JSON.stringify({ error: `Table "${tableName || 'Projects'}" not found in Airtable base` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found table: ${targetTable.name} (${targetTable.id})`);

    // Extract all select field options
    const fieldOptions: Record<string, { name: string; type: string; choices: { id: string; name: string; color?: string }[] }> = {};

    targetTable.fields.forEach((field: any) => {
      if (field.type === 'singleSelect' || field.type === 'multipleSelects') {
        const choices = field.options?.choices || [];
        fieldOptions[field.name] = {
          name: field.name,
          type: field.type,
          choices: choices.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color,
          })),
        };
        console.log(`Field "${field.name}" (${field.type}): ${choices.map((c: any) => c.name).join(', ')}`);
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        tableName: targetTable.name,
        tableId: targetTable.id,
        fieldOptions,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching field options:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

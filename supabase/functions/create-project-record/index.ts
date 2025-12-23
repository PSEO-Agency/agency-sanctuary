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
    const { baseId, name, language, languageEngine } = await req.json();
    
    if (!baseId || !name) {
      return new Response(
        JSON.stringify({ error: 'baseId and name are required' }),
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

    console.log(`Creating project record in Airtable base: ${baseId}`);
    console.log(`Project: ${name}, Language: ${language}, Engine: ${languageEngine}`);

    // First, get the schema to find the Projects table ID
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
    const projectsTable = schemaData.tables.find((t: any) => t.name === 'Projects');

    if (!projectsTable) {
      return new Response(
        JSON.stringify({ error: 'Projects table not found in Airtable base' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found Projects table: ${projectsTable.id}`);

    // Find the primary field (usually the first field or has primaryFieldId)
    const primaryField = projectsTable.fields.find((f: any) => f.id === projectsTable.primaryFieldId);
    const primaryFieldName = primaryField?.name || 'Name';
    
    console.log(`Primary field name: ${primaryFieldName}`);

    // Build the fields object for the record using dynamic field names
    const fields: Record<string, any> = {
      [primaryFieldName]: name,
    };

    // Try to find Type field if it exists
    const typeField = projectsTable.fields.find((f: any) => 
      f.name.toLowerCase() === 'type' || f.name === 'Type'
    );
    if (typeField) {
      fields[typeField.name] = "Content";
    }

    // Try to find Language field if it exists
    const languageField = projectsTable.fields.find((f: any) => 
      f.name.toLowerCase() === 'language' || f.name === 'Language'
    );
    if (language && languageField) {
      fields[languageField.name] = language;
    }
    
    // Try to find Language engine field if it exists
    const engineField = projectsTable.fields.find((f: any) => 
      f.name.toLowerCase().includes('language') && f.name.toLowerCase().includes('engine')
    );
    if (languageEngine && engineField) {
      fields[engineField.name] = languageEngine;
    }

    console.log('Creating record with fields:', fields);

    // Create the project record
    const createResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/${projectsTable.id}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields,
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Failed to create record:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create project record', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recordData = await createResponse.json();
    console.log('Created record:', recordData.id);

    return new Response(
      JSON.stringify({
        success: true,
        recordId: recordData.id,
        fields: recordData.fields,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating project record:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

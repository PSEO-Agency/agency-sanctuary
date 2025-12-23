import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AirtableField {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: {
    choices?: Array<{
      id: string;
      name: string;
      color?: string;
    }>;
    linkedTableId?: string;
    prefersSingleRecordLink?: boolean;
    inverseLinkFieldId?: string;
    isReversed?: boolean;
    result?: {
      type: string;
      options?: Record<string, unknown>;
    };
    formula?: string;
  };
}

interface AirtableTable {
  id: string;
  name: string;
  description?: string;
  primaryFieldId: string;
  fields: AirtableField[];
}

interface AirtableBaseResponse {
  tables: AirtableTable[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseId } = await req.json();
    
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

    console.log(`Fetching complete schema for Airtable base: ${baseId}`);

    // Fetch base schema from Airtable Meta API
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
      console.error('Airtable API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch schema: ${schemaResponse.status}`, details: errorText }),
        { status: schemaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const schemaData: AirtableBaseResponse = await schemaResponse.json();
    
    console.log(`Found ${schemaData.tables.length} tables in base ${baseId}`);
    
    // Log table names for debugging
    schemaData.tables.forEach(table => {
      console.log(`Table: ${table.name} (${table.id}) - ${table.fields.length} fields`);
      
      // Log fields with dropdown options
      const selectFields = table.fields.filter(f => 
        f.type === 'singleSelect' || f.type === 'multipleSelects'
      );
      if (selectFields.length > 0) {
        console.log(`  Select fields in ${table.name}:`);
        selectFields.forEach(field => {
          const options = field.options?.choices?.map(c => c.name).join(', ') || 'no options';
          console.log(`    - ${field.name} (${field.type}): ${options}`);
        });
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        baseId,
        tableCount: schemaData.tables.length,
        tables: schemaData.tables.map(table => ({
          id: table.id,
          name: table.name,
          description: table.description,
          primaryFieldId: table.primaryFieldId,
          fieldCount: table.fields.length,
          fields: table.fields.map(field => ({
            id: field.id,
            name: field.name,
            type: field.type,
            description: field.description,
            options: field.options,
          })),
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Airtable schema:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

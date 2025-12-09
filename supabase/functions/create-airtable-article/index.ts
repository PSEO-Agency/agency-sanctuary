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
    const { baseId, fields } = await req.json();
    
    if (!baseId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Base ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const airtableApiKey = Deno.env.get('AIRTABLE_API_KEY');
    if (!airtableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Airtable API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Creating new article in base ${baseId}`);
    console.log('Fields:', fields);

    // First, discover tables in the base to find "pSEO Pages" table
    const metaResponse = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text();
      console.error('Airtable meta API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch base metadata: ${metaResponse.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: metaResponse.status }
      );
    }

    const metaData = await metaResponse.json();
    
    // Find the pSEO Pages table by name
    const pSEOTable = metaData.tables.find((t: { name: string }) => 
      t.name.toLowerCase().includes('pseo') || 
      t.name.toLowerCase().includes('pages') ||
      t.name.toLowerCase() === 'pseo pages'
    );

    if (!pSEOTable) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not find pSEO Pages table in this base' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`Found table: ${pSEOTable.name} (${pSEOTable.id})`);

    // Map our field names to Airtable field names
    const airtableFields: Record<string, any> = {};
    
    // Required fields
    if (fields.name) {
      airtableFields['Name'] = fields.name;
    }
    
    // Language is a singleSelect with choices: "Dutch", "English"
    if (fields.language) {
      airtableFields['Language'] = fields.language;
    }

    // Map configuration to individual Airtable fields
    // Based on schema: all these fields are singleSelect with "Yes"/"No" choices
    if (fields.config) {
      const config = fields.config;
      
      // Boolean fields -> "Yes" / "No" singleSelect
      airtableFields['Approve SEO Data'] = config.approveEditSeoData ? 'Yes' : 'No';
      airtableFields['Approve Outline'] = config.approveOutline ? 'Yes' : 'No';
      airtableFields['Approve Content'] = config.approveContent ? 'Yes' : 'No';
      airtableFields['NLP/SEO Research'] = config.seoNlpResearch ? 'Yes' : 'No';
      airtableFields['Use Top 10 SERP'] = config.useTop10Serp ? 'Yes' : 'No';
      airtableFields['Topic Research'] = config.topicResearch ? 'Yes' : 'No';
      
      // Image Selection is singleSelect: "Manual", "Dynamic", "Media Library", "API", "AI"
      if (config.imageSelection) {
        const imageMap: Record<string, string> = {
          'manual': 'Manual',
          'dynamic': 'Dynamic',
          'media_library': 'Media Library',
          'api': 'API',
          'ai': 'AI',
        };
        airtableFields['Image Selection'] = imageMap[config.imageSelection] || 'Manual';
      }
      
      // Include Internal links is singleSelect: "And always include internal links." / "And never include internal links."
      if (config.addInternalLinks !== undefined) {
        airtableFields['Include Internal links'] = config.addInternalLinks 
          ? 'And always include internal links.' 
          : 'And never include internal links.';
      }
      
      // Include External Links is singleSelect: "And always include internal links." / "And never include internal links."
      // (same wording as internal links in schema)
      if (config.addExternalLinks !== undefined) {
        airtableFields['Include External Links'] = config.addExternalLinks 
          ? 'And always include internal links.' 
          : 'And never include internal links.';
      }
      
      // Guidelines are richText fields
      if (config.internalLinksCount !== undefined) {
        airtableFields['Internal Links Guideline'] = `Include ${config.internalLinksCount} internal links.`;
      }
      if (config.externalLinksCount !== undefined) {
        airtableFields['External Links Guideline'] = `Include ${config.externalLinksCount} external links/citations.`;
      }
    }

    console.log('Mapped Airtable fields:', airtableFields);

    // Create the record
    const createResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${pSEOTable.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: airtableFields }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Airtable create error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create record: ${createResponse.status}`, details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: createResponse.status }
      );
    }

    const createdRecord = await createResponse.json();
    console.log('Successfully created record:', createdRecord.id);

    return new Response(
      JSON.stringify({ success: true, record: createdRecord }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error creating article:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

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
    
    // Log field types to understand the schema
    const fieldTypes = pSEOTable.fields?.reduce((acc: Record<string, string>, f: { name: string, type: string }) => {
      acc[f.name] = f.type;
      return acc;
    }, {});
    console.log('Field types:', fieldTypes);

    // Map our field names to Airtable field names
    const airtableFields: Record<string, any> = {};
    
    // Required fields
    if (fields.name) {
      airtableFields['Name'] = fields.name;
    }
    
    // Optional fields - Language is typically a single select
    if (fields.language) {
      airtableFields['Language'] = fields.language;
    }
    
    // Skip Status field - let Airtable use its default
    // The field has specific options that may not match "Draft"

    // Map configuration to individual Airtable fields based on the table schema
    // These fields could be checkboxes OR single selects - handle both
    if (fields.config) {
      const config = fields.config;
      
      // Helper to get correct value based on field type
      const getBoolFieldValue = (fieldName: string, value: boolean) => {
        const fieldType = fieldTypes?.[fieldName];
        if (fieldType === 'checkbox') {
          return value ? true : undefined; // Checkbox: true or omit
        } else if (fieldType === 'singleSelect') {
          return value ? 'Yes' : 'No'; // Single select: "Yes" or "No"
        }
        // Default: try as checkbox (only send if true)
        return value ? true : undefined;
      };

      // Boolean/checkbox/select fields
      const approveSeoval = getBoolFieldValue('Approve SEO Data', config.approveEditSeoData);
      if (approveSeoval !== undefined) airtableFields['Approve SEO Data'] = approveSeoval;
      
      const approveOutlineVal = getBoolFieldValue('Approve Outline', config.approveOutline);
      if (approveOutlineVal !== undefined) airtableFields['Approve Outline'] = approveOutlineVal;
      
      const approveContentVal = getBoolFieldValue('Approve Content', config.approveContent);
      if (approveContentVal !== undefined) airtableFields['Approve Content'] = approveContentVal;
      
      const nlpResearchVal = getBoolFieldValue('NLP/SEO Research', config.seoNlpResearch);
      if (nlpResearchVal !== undefined) airtableFields['NLP/SEO Research'] = nlpResearchVal;
      
      const top10Val = getBoolFieldValue('Use Top 10 SERP', config.useTop10Serp);
      if (top10Val !== undefined) airtableFields['Use Top 10 SERP'] = top10Val;
      
      const topicResearchVal = getBoolFieldValue('Topic Research', config.topicResearch);
      if (topicResearchVal !== undefined) airtableFields['Topic Research'] = topicResearchVal;
      
      const extLinksVal = getBoolFieldValue('Include External Links', config.addExternalLinks);
      if (extLinksVal !== undefined) airtableFields['Include External Links'] = extLinksVal;
      
      const intLinksVal = getBoolFieldValue('Include Internal links', config.addInternalLinks);
      if (intLinksVal !== undefined) airtableFields['Include Internal links'] = intLinksVal;
      
      // String/select fields
      if (config.imageSelection) {
        airtableFields['Image Selection'] = config.imageSelection;
      }
      if (config.externalLinksCount !== undefined) {
        airtableFields['External Links Guideline'] = String(config.externalLinksCount);
      }
      if (config.internalLinksCount !== undefined) {
        airtableFields['Internal Links Guideline'] = String(config.internalLinksCount);
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

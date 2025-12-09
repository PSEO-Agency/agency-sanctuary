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
    const { baseId, recordId, fields } = await req.json();
    
    if (!baseId || !recordId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Base ID and Record ID are required' }),
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

    console.log(`Updating article ${recordId} in base ${baseId}`);
    console.log('Fields to update:', Object.keys(fields));

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

    // Map our field names to Airtable field names
    const airtableFields: Record<string, any> = {};
    
    if (fields.metaTitle !== undefined) {
      airtableFields['Meta title'] = fields.metaTitle;
    }
    if (fields.metaDescription !== undefined) {
      airtableFields['Meta Description'] = fields.metaDescription;
    }
    if (fields.slug !== undefined) {
      airtableFields['Slug Manual'] = fields.slug;
    }
    if (fields.content !== undefined) {
      airtableFields['SEO Content'] = fields.content;
    }
    if (fields.outline !== undefined) {
      airtableFields['SEO Outline'] = fields.outline;
    }
    if (fields.status !== undefined) {
      airtableFields['Status'] = fields.status;
    }
    
    // Handle configuration fields - store as JSON string in a Configuration field
    if (fields.config !== undefined) {
      airtableFields['Configuration'] = JSON.stringify(fields.config);
    }

    console.log('Mapped Airtable fields:', airtableFields);

    // Update the record
    const updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${pSEOTable.id}/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: airtableFields }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Airtable update error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to update record: ${updateResponse.status}`, details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: updateResponse.status }
      );
    }

    const updatedRecord = await updateResponse.json();
    console.log('Successfully updated record:', updatedRecord.id);

    return new Response(
      JSON.stringify({ success: true, record: updatedRecord }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error updating article:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

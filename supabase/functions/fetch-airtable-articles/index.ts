import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { baseId, projectRecordId } = await req.json();
    
    if (!baseId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Base ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Filtering by projectRecordId: ${projectRecordId || 'none'}`);
    

    const airtableApiKey = Deno.env.get('AIRTABLE_API_KEY');
    if (!airtableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Airtable API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Fetching articles from Airtable base: ${baseId}`);

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
      console.log('Available tables:', metaData.tables.map((t: { name: string }) => t.name));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not find pSEO Pages table in this base',
          availableTables: metaData.tables.map((t: { name: string }) => t.name)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`Found table: ${pSEOTable.name} (${pSEOTable.id})`);
    console.log(`Table fields:`, pSEOTable.fields?.map((f: { name: string }) => f.name));

    // Build URL with optional project filter
    let url = `https://api.airtable.com/v0/${baseId}/${pSEOTable.id}?maxRecords=100`;
    
    // If projectRecordId is provided, filter by linked Projects field
    if (projectRecordId) {
      const filterFormula = encodeURIComponent(`FIND("${projectRecordId}", ARRAYJOIN({Projects}, ","))`);
      url += `&filterByFormula=${filterFormula}`;
      console.log(`Applying filter for project: ${projectRecordId}`);
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Airtable API error: ${response.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform the records - map available fields flexibly
    const articles = data.records.map((record: any) => {
      const f = record.fields;
      return {
        id: record.id,
        name: f['Name'] || f['Title'] || 'Untitled',
        status: f['Status'] || 'Draft',
        createdBy: f['Users'] || f['Created By'] || f['Author'] || null,
        createdAt: f['Created'] || f['Created Time'] || record.createdTime || null,
        language: f['Language'] || 'English',
        contentScore: f['Avg Content Score'] || f['Content Score'] || null,
        slug: f['Slug Manual'] || f['Slug'] || '',
        metaTitle: f['Meta title'] || f['Meta Title'] || '',
        metaDescription: f['Meta Description'] || '',
        wordCount: f['Avg Word Count'] || f['Word Count'] || 0,
        readability: f['Target Readability'] || f['Readability'] || null,
        imageUrl: f['Image URL'] || f['Featured Image'] || null,
        content: f['SEO Content'] || f['Content'] || '',
        outline: f['SEO Outline'] || f['Outline'] || '',
        html: f['HTML'] || '',
        config: f['Configuration'] || null,
      };
    });

    console.log(`Successfully fetched ${articles.length} articles from ${pSEOTable.name}`);

    return new Response(
      JSON.stringify({ success: true, articles, tableName: pSEOTable.name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error fetching articles:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

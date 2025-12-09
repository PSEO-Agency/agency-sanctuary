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
    const { baseId } = await req.json();
    
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

    // Fetch records from the discovered table
    const fields = [
      'Name',
      'Status',
      'Users',
      'Created At',
      'Language',
      'Avg Content Score',
      'Slug Manual',
      'Meta title',
      'Meta Description',
      'Avg Word Count',
      'Target Readability',
      'Image URL',
      'SEO Content',
      'SEO Outline',
      'HTML'
    ];

    const fieldsParam = fields.map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&');
    const url = `https://api.airtable.com/v0/${baseId}/${pSEOTable.id}?${fieldsParam}&maxRecords=100`;

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
    
    // Transform the records to a cleaner format
    const articles = data.records.map((record: any) => ({
      id: record.id,
      name: record.fields['Name'] || 'Untitled',
      status: record.fields['Status'] || 'Draft',
      createdBy: record.fields['Users'] || null,
      createdAt: record.fields['Created At'] || null,
      language: record.fields['Language'] || 'English',
      contentScore: record.fields['Avg Content Score'] || null,
      slug: record.fields['Slug Manual'] || '',
      metaTitle: record.fields['Meta title'] || '',
      metaDescription: record.fields['Meta Description'] || '',
      wordCount: record.fields['Avg Word Count'] || 0,
      readability: record.fields['Target Readability'] || null,
      imageUrl: record.fields['Image URL'] || null,
      content: record.fields['SEO Content'] || '',
      outline: record.fields['SEO Outline'] || '',
      html: record.fields['HTML'] || '',
    }));

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

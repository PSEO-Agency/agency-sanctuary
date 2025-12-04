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

    // Fetch records from pSEO Pages table
    const tableId = 'tbl3DQjpJaokdeFGn';
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
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?${fieldsParam}&maxRecords=100`;

    console.log(`Fetching articles from Airtable base: ${baseId}`);

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

    console.log(`Successfully fetched ${articles.length} articles`);

    return new Response(
      JSON.stringify({ success: true, articles }),
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

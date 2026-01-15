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
    const { baseId, projectRecordId, countOnly } = await req.json();
    
    if (!baseId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Base ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Fetching articles from base ${baseId}, countOnly: ${countOnly}, projectRecordId: ${projectRecordId || 'none'}`);

    const airtableApiKey = Deno.env.get('AIRTABLE_API_KEY');
    if (!airtableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Airtable API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

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
          articles: [],
          count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`Found table: ${pSEOTable.name} (${pSEOTable.id})`);

    // Paginate through all records to get accurate count
    let allRecords: any[] = [];
    let offset: string | undefined = undefined;
    
    do {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${pSEOTable.id}`);
      url.searchParams.set('pageSize', '100');
      
      // For countOnly, we only need minimal fields to reduce payload
      if (countOnly) {
        url.searchParams.append('fields[]', 'Name');
      }
      
      if (offset) {
        url.searchParams.set('offset', offset);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Airtable API error:', errorText);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to fetch records: ${response.status}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
        );
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset;
      
      console.log(`Fetched ${data.records?.length || 0} records, total so far: ${allRecords.length}, has more: ${!!offset}`);
    } while (offset);

    console.log(`Total records fetched: ${allRecords.length}`);

    // Filter by projectRecordId in-memory if provided
    let filteredRecords = allRecords;
    if (projectRecordId) {
      console.log(`Filtering ${allRecords.length} records for project: ${projectRecordId}`);
      filteredRecords = allRecords.filter((record: any) => {
        const projects = record.fields['Projects'];
        // Projects is an array of linked record IDs
        if (Array.isArray(projects)) {
          const matches = projects.includes(projectRecordId);
          return matches;
        }
        return false;
      });
      console.log(`After filtering: ${filteredRecords.length} records match`);
    }

    // If countOnly, return just the count
    if (countOnly) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          count: filteredRecords.length,
          totalUnfiltered: allRecords.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Helper to extract creator name from collaborator field or text field
    const getCreatorName = (usersField: any, creatorNameField: any): string[] | null => {
      // First, try the explicit creator name text field (from our app)
      if (creatorNameField && typeof creatorNameField === 'string') {
        return [creatorNameField];
      }
      
      if (!usersField) return null;
      if (Array.isArray(usersField)) {
        // Collaborator fields return objects with { id, email, name }
        const names = usersField.map((user: any) => {
          if (typeof user === 'object' && user.name) {
            return user.name;
          }
          if (typeof user === 'object' && user.email) {
            return user.email.split('@')[0];
          }
          if (typeof user === 'string') {
            return null;
          }
          return null;
        }).filter(Boolean);
        return names.length > 0 ? names : null;
      }
      if (typeof usersField === 'object' && usersField.name) {
        return [usersField.name];
      }
      if (typeof usersField === 'object' && usersField.email) {
        return [usersField.email.split('@')[0]];
      }
      if (typeof usersField === 'string') {
        return null;
      }
      return null;
    };

    // Transform the filtered records
    const articles = filteredRecords.map((record: any) => {
      const f = record.fields;
      return {
        id: record.id,
        name: f['Name'] || f['Title'] || 'Untitled',
        status: f['Status'] || 'Draft',
        createdBy: getCreatorName(
          f['Users'] || f['Created By'] || f['Author'],
          f['Created By Name'] || f['Creator'] || f['Author Name']
        ),
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
      JSON.stringify({ success: true, articles, count: articles.length, tableName: pSEOTable.name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error fetching articles:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, articles: [], count: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

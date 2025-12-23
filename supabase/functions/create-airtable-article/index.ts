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
    const { baseId, fields, projectRecordId } = await req.json();
    
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
    console.log('Project Record ID:', projectRecordId);

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

    console.log(`Found pSEO Pages table: ${pSEOTable.name} (${pSEOTable.id})`);

    // Find the Projects table to get its ID for linked record field discovery
    const projectsTable = metaData.tables.find((t: { name: string }) => 
      t.name.toLowerCase() === 'projects'
    );
    const projectsTableId = projectsTable?.id;
    console.log(`Found Projects table: ${projectsTable?.name} (${projectsTableId})`);

    // Find the linked record field that links pSEO Pages to Projects table
    let projectLinkFieldName: string | null = null;
    if (pSEOTable.fields && projectsTableId) {
      const projectLinkField = pSEOTable.fields.find((f: any) => 
        f.type === 'multipleRecordLinks' && 
        f.options?.linkedTableId === projectsTableId
      );
      if (projectLinkField) {
        projectLinkFieldName = projectLinkField.name;
        console.log(`Found project link field: "${projectLinkFieldName}" (links to Projects table)`);
      } else {
        console.log('No linked record field found that connects to Projects table');
      }
    }

    // Build a set of available field names in this table
    const availableFields = new Set<string>();
    if (pSEOTable.fields) {
      for (const field of pSEOTable.fields) {
        availableFields.add(field.name);
      }
    }
    console.log('Available fields in pSEO Pages:', Array.from(availableFields).join(', '));

    // Set initial status to "Start Research" to trigger the pipeline
    if (availableFields.has('Status')) {
      // Will be added below in the mapping section
    }

    // Map our field names to Airtable field names - only include fields that exist
    const airtableFields: Record<string, any> = {};
    const skippedFields: string[] = [];
    
    // Helper to safely add a field only if it exists in the table
    const addFieldIfExists = (fieldName: string, value: any) => {
      if (availableFields.has(fieldName)) {
        airtableFields[fieldName] = value;
      } else {
        skippedFields.push(fieldName);
      }
    };
    
    // Required fields
    if (fields.name) {
      addFieldIfExists('Name', fields.name);
    }
    
    // Set status to "Start Research" to trigger the processing pipeline
    addFieldIfExists('Status', 'Start Research');
    
    // Language is a singleSelect with choices: "Dutch", "English"
    if (fields.language) {
      addFieldIfExists('Language', fields.language);
    }

    // Map configuration to individual Airtable fields
    if (fields.config) {
      const config = fields.config;
      
      // Boolean fields -> "Yes" / "No" singleSelect
      addFieldIfExists('Approve SEO Data', config.approveEditSeoData ? 'Yes' : 'No');
      addFieldIfExists('Approve Outline', config.approveOutline ? 'Yes' : 'No');
      addFieldIfExists('Approve Content', config.approveContent ? 'Yes' : 'No');
      addFieldIfExists('NLP/SEO Research', config.seoNlpResearch ? 'Yes' : 'No');
      addFieldIfExists('Use Top 10 SERP', config.useTop10Serp ? 'Yes' : 'No');
      addFieldIfExists('Topic Research', config.topicResearch ? 'Yes' : 'No');
      
      // Image Selection is singleSelect: "Manual", "Dynamic", "Media Library", "API", "AI"
      if (config.imageSelection) {
        const imageMap: Record<string, string> = {
          'manual': 'Manual',
          'dynamic': 'Dynamic',
          'media_library': 'Media Library',
          'api': 'API',
          'ai': 'AI',
        };
        addFieldIfExists('Image Selection', imageMap[config.imageSelection] || 'Manual');
      }
      
      // Include Internal links is singleSelect
      if (config.addInternalLinks !== undefined) {
        addFieldIfExists('Include Internal links', config.addInternalLinks 
          ? 'And always include internal links.' 
          : 'And never include internal links.');
      }
      
      // Include External Links is singleSelect
      if (config.addExternalLinks !== undefined) {
        addFieldIfExists('Include External Links', config.addExternalLinks 
          ? 'And always include internal links.' 
          : 'And never include internal links.');
      }
      
      // Guidelines are richText fields - only add if they exist in the schema
      if (config.internalLinksCount !== undefined) {
        addFieldIfExists('Internal Links Guideline', `Include ${config.internalLinksCount} internal links.\n`);
      }
      if (config.externalLinksCount !== undefined) {
        addFieldIfExists('External Links Guideline', `Include ${config.externalLinksCount} external links/citations.\n`);
      }
    }

    // Link to project using the dynamically discovered linked record field
    // In Airtable, linked records are passed as an array of record IDs
    if (projectRecordId && projectLinkFieldName) {
      airtableFields[projectLinkFieldName] = [projectRecordId];
      console.log(`Linking article to project using field: "${projectLinkFieldName}" with record ID: ${projectRecordId}`);
    } else if (projectRecordId) {
      console.log('Warning: Could not link article to project - no link field found');
    }

    if (skippedFields.length > 0) {
      console.log('Skipped fields (not in table schema):', skippedFields);
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

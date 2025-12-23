import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { subaccountId, subaccountName } = await req.json();
    
    if (!subaccountId || !subaccountName) {
      console.error('Missing required fields:', { subaccountId, subaccountName });
      return new Response(
        JSON.stringify({ error: 'subaccountId and subaccountName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Setting up Airtable base for subaccount: ${subaccountName} (${subaccountId})`);

    const pseoApiKey = Deno.env.get('PSEO_API_KEY');
    if (!pseoApiKey) {
      console.error('PSEO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'PSEO_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the PSEO API to create an Airtable base for this subaccount
    const pseoApiUrl = 'https://n8n.virtualmin.programmaticseobuilder.com/webhook/pb/v1/projects';
    
    console.log(`Calling PSEO API: ${pseoApiUrl}`);
    
    const webhookResponse = await fetch(pseoApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PSEO-API-KEY': pseoApiKey,
      },
      body: JSON.stringify({
        name: subaccountName,
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('PSEO API error:', webhookResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `PSEO API error: ${webhookResponse.status}`,
          details: errorText,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await webhookResponse.json();
    console.log('PSEO API response:', data);

    // The API returns 'id' as the Airtable base ID
    if (data.id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('subaccounts')
        .update({ airtable_base_id: data.id })
        .eq('id', subaccountId);

      if (updateError) {
        console.error('Failed to update subaccount with base ID:', updateError);
        return new Response(
          JSON.stringify({
            success: true,
            baseId: data.id,
            warning: 'Airtable base created but failed to update subaccount record',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Updated subaccount ${subaccountId} with base ID: ${data.id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        baseId: data.id || null,
        name: data.name,
        message: 'Airtable base created successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error setting up Airtable base:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

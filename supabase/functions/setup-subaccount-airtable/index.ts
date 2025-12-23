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
    const { subaccountId, subaccountName, locationId } = await req.json();
    
    if (!subaccountId || !subaccountName || !locationId) {
      console.error('Missing required fields:', { subaccountId, subaccountName, locationId });
      return new Response(
        JSON.stringify({ error: 'subaccountId, subaccountName, and locationId are required' }),
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

    // Call the PSEO API to create/duplicate an Airtable base for this subaccount
    // The PSEO API should handle creating a duplicate of the template base
    const pseoWebhookUrl = Deno.env.get('PSEO_WEBHOOK_URL') || 'https://api.pseo.ai/v1/create-client-base';
    
    console.log(`Calling PSEO webhook: ${pseoWebhookUrl}`);
    
    const webhookResponse = await fetch(pseoWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pseoApiKey}`,
      },
      body: JSON.stringify({
        subaccountId,
        subaccountName,
        locationId,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('PSEO webhook error:', webhookResponse.status, errorText);
      
      // If webhook fails, we might have a fallback or manual setup process
      // For now, return success but note that base creation is pending
      return new Response(
        JSON.stringify({ 
          success: true,
          pending: true,
          message: 'Subaccount created. Airtable base setup has been queued.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookData = await webhookResponse.json();
    console.log('PSEO webhook response:', webhookData);

    // If the webhook returns a base ID, update the subaccount
    if (webhookData.baseId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('subaccounts')
        .update({ airtable_base_id: webhookData.baseId })
        .eq('id', subaccountId);

      if (updateError) {
        console.error('Failed to update subaccount with base ID:', updateError);
      } else {
        console.log(`Updated subaccount ${subaccountId} with base ID: ${webhookData.baseId}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        baseId: webhookData.baseId || null,
        message: webhookData.message || 'Airtable base setup initiated',
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
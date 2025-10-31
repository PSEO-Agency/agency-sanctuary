import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subaccountId, postId, title, content, excerpt, featuredImage, categories, tags } = await req.json();

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get WordPress credentials from subaccount settings
    const { data: subaccount, error: subaccountError } = await supabaseClient
      .from('subaccounts')
      .select('integration_settings')
      .eq('id', subaccountId)
      .single();

    if (subaccountError) throw subaccountError;

    const wpConfig = (subaccount.integration_settings as any)?.wordpress;
    
    if (!wpConfig?.url || !wpConfig?.username || !wpConfig?.app_password) {
      throw new Error('WordPress integration not configured');
    }

    // Prepare WordPress API request
    const wpApiUrl = `${wpConfig.url}/wp-json/wp/v2/posts`;
    const authHeader = `Basic ${btoa(`${wpConfig.username}:${wpConfig.app_password}`)}`;

    // Create WordPress post payload
    const wpPostData: any = {
      title,
      content,
      excerpt,
      status: 'publish',
    };

    // Add featured image if provided
    if (featuredImage) {
      wpPostData.featured_media = featuredImage;
    }

    // Publish to WordPress
    const wpResponse = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(wpPostData),
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error('WordPress API error:', errorText);
      throw new Error(`WordPress API error: ${wpResponse.status} - ${errorText}`);
    }

    const wpPost = await wpResponse.json();

    console.log('Successfully published to WordPress:', wpPost.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        postId: wpPost.id,
        url: wpPost.link 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in publish-to-wordpress function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

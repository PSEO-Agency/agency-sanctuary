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
    const { url, username, appPassword } = await req.json();

    if (!url || !username || !appPassword) {
      throw new Error('Missing required credentials');
    }

    // Test WordPress REST API connection
    const wpApiUrl = `${url}/wp-json/wp/v2/users/me`;
    const authHeader = `Basic ${btoa(`${username}:${appPassword}`)}`;

    const response = await fetch(wpApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress connection test failed:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Connection failed: ${response.status} - ${errorText}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData = await response.json();
    console.log('WordPress connection successful for user:', userData.name);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userData.name 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in test-wordpress-connection function:', error);
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

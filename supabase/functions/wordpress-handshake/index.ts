import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 2,
  baseDelayMs: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

function normalizeBaseUrl(baseUrl: string): string {
  let url = baseUrl.trim();
  // Remove trailing slashes
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  // Ensure https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

function buildEndpoint(baseUrl: string, path: string): string {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  return `${normalizedBase}/index.php?rest_route=${encodeURIComponent(path)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId, baseUrl, apiKey } = await req.json();

    if (!baseUrl || !apiKey) {
      throw new Error('Missing required fields: baseUrl and apiKey');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const endpoint = buildEndpoint(baseUrl, '/pscm/v1/ping');
    console.log(`Testing handshake to: ${endpoint}`);

    let response: Response;
    let errorMessage: string | null = null;
    let status: 'connected' | 'error' = 'error';

    try {
      response = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PSCM-KEY': apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Handshake response:', data);

        if (data.ok === true) {
          status = 'connected';
          errorMessage = null;

          // Update connection status if connectionId provided
          if (connectionId) {
            await supabaseClient
              .from('wordpress_connections')
              .update({
                status: 'connected',
                last_checked_at: new Date().toISOString(),
                last_error: null,
              })
              .eq('id', connectionId);
          }

          return new Response(
            JSON.stringify({
              success: true,
              status: 'connected',
              site: data.site,
              wp: data.wp,
              yoast_active: data.yoast_active,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          errorMessage = data.message || 'Handshake returned ok: false';
        }
      } else if (response.status === 401) {
        errorMessage = 'Invalid API key. Please regenerate your API key in WordPress and update it here.';
      } else if (response.status === 404) {
        errorMessage = 'Plugin endpoint not found. Check plugin installed and permalinks flushed.';
      } else {
        const errorText = await response.text();
        errorMessage = `HTTP ${response.status}: ${errorText.substring(0, 200)}`;
      }
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Site may be slow or unreachable.';
      } else {
        errorMessage = `Cannot reach site. Check base URL / SSL / firewall. Error: ${err.message}`;
      }
    }

    // Update connection with error status if connectionId provided
    if (connectionId) {
      await supabaseClient
        .from('wordpress_connections')
        .update({
          status: 'error',
          last_checked_at: new Date().toISOString(),
          last_error: errorMessage,
        })
        .eq('id', connectionId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        status: 'error',
        error: errorMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in wordpress-handshake function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

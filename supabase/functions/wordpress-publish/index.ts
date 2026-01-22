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
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for publish
      
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
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

function buildEndpoint(baseUrl: string, path: string): string {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  return `${normalizedBase}/index.php?rest_route=${encodeURIComponent(path)}`;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  const plainText = text.replace(/<[^>]*>/g, '').trim();
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength - 3) + '...';
}

function generateExcerpt(content: string, maxLength: number = 160): string {
  return truncateText(content, maxLength);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      connectionId,
      subaccountId,
      article,
      publishStatus = 'draft',
    } = await req.json();

    // Validate required fields
    if (!connectionId || !subaccountId || !article) {
      throw new Error('Missing required fields: connectionId, subaccountId, article');
    }

    if (!article.title || !article.content) {
      throw new Error('Article must have title and content');
    }

    if (!['draft', 'publish'].includes(publishStatus)) {
      throw new Error('publishStatus must be "draft" or "publish"');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch connection details
    const { data: connection, error: connError } = await supabaseClient
      .from('wordpress_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    if (connection.status !== 'connected') {
      throw new Error('Connection is not in connected state. Please test the connection first.');
    }

    // Build the payload for the WordPress plugin
    const slug = article.slug || generateSlug(article.title);
    const excerpt = article.excerpt || article.metaDescription || generateExcerpt(article.content, 160);
    const metaTitle = article.metaTitle || article.seoTitle || article.title;
    const metaDesc = truncateText(article.metaDescription || excerpt, 160);

    const payload = {
      title: article.title,
      content: article.content,
      excerpt: excerpt,
      slug: slug,
      status: publishStatus,
      categories: article.categories || ['Programmatic SEO'],
      tags: article.tags || [],
      featuredImageUrl: article.featuredImageUrl || article.imageUrl || null,
      yoast: {
        title: metaTitle,
        metadesc: metaDesc,
        focuskw: article.focusKeyword || (article.tags?.[0] || ''),
        canonical: article.canonicalUrl || null,
        noindex: article.noindex || false,
        nofollow: article.nofollow || false,
        ogTitle: article.ogTitle || metaTitle,
        ogDesc: article.ogDescription || metaDesc,
        twitterTitle: article.twitterTitle || metaTitle,
        twitterDesc: article.twitterDescription || metaDesc,
      },
    };

    const endpoint = buildEndpoint(connection.base_url, '/pscm/v1/posts');
    console.log(`Publishing to: ${endpoint}`);
    console.log(`Payload (title): ${payload.title}, status: ${payload.status}`);

    let response: Response;
    let errorMessage: string | null = null;

    try {
      response = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PSCM-KEY': connection.api_key,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log('Publish response:', responseData);

      if (response.ok && responseData.ok === true) {
        // Success - save publication record
        const { error: pubError } = await supabaseClient
          .from('article_publications')
          .insert({
            subaccount_id: subaccountId,
            connection_id: connectionId,
            article_airtable_id: article.airtableId || article.id || 'unknown',
            wordpress_post_id: responseData.postId,
            wordpress_post_url: responseData.link,
            publish_status: responseData.status || publishStatus,
            published_at: new Date().toISOString(),
          });

        if (pubError) {
          console.error('Failed to save publication record:', pubError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            postId: responseData.postId,
            postUrl: responseData.link,
            status: responseData.status || publishStatus,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        errorMessage = responseData.message || responseData.error || `Failed with status ${response.status}`;
        if (responseData.details) {
          errorMessage += `: ${JSON.stringify(responseData.details)}`;
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. The site may be slow or the content too large.';
      } else {
        errorMessage = `Network error: ${err.message}`;
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in wordpress-publish function:', error);
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

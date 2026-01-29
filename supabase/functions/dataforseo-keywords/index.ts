import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DataForSEORequest {
  operation: 
    | "keyword_suggestions"
    | "search_volume"
    | "keyword_difficulty"
    | "serp_competitors"
    | "competitor_keywords"
    | "test_connection";
  connection_id: string;
  keywords?: string[];
  domain?: string;
  location_code?: number;
  language_code?: string;
  limit?: number;
}

const DATAFORSEO_BASE_URL = "https://api.dataforseo.com/v3";

async function makeDataForSEORequest(
  endpoint: string,
  body: any,
  login: string,
  password: string
): Promise<any> {
  const authString = btoa(`${login}:${password}`);
  
  console.log(`Making DataForSEO request to: ${endpoint}`);
  
  const response = await fetch(`${DATAFORSEO_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authString}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("DataForSEO API error:", data);
    throw new Error(data.status_message || `DataForSEO API error: ${response.status}`);
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestBody: DataForSEORequest = await req.json();
    const { 
      operation, 
      connection_id, 
      keywords = [], 
      domain,
      location_code = 2840, // US
      language_code = "en",
      limit = 50 
    } = requestBody;

    console.log(`DataForSEO operation: ${operation}, connection: ${connection_id}`);

    // Fetch connection credentials
    const { data: connection, error: connError } = await supabase
      .from("seo_connections")
      .select("*")
      .eq("id", connection_id)
      .single();

    if (connError || !connection) {
      console.error("Connection fetch error:", connError);
      return new Response(JSON.stringify({ error: "SEO connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const credentials = connection.credentials as { login?: string; password?: string };
    if (!credentials?.login || !credentials?.password) {
      return new Response(JSON.stringify({ error: "Invalid connection credentials" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { login, password } = credentials;
    let result: any;

    switch (operation) {
      case "test_connection": {
        // Simple balance check to verify credentials
        const authString = btoa(`${login}:${password}`);
        const response = await fetch(`${DATAFORSEO_BASE_URL}/appendix/user_data`, {
          method: "GET",
          headers: {
            "Authorization": `Basic ${authString}`,
          },
        });
        
        const data = await response.json();
        
        if (!response.ok || data.status_code !== 20000) {
          throw new Error(data.status_message || "Invalid credentials");
        }
        
        result = { 
          success: true, 
          balance: data.tasks?.[0]?.result?.[0]?.money?.balance || 0,
          user: data.tasks?.[0]?.result?.[0]?.login
        };
        break;
      }

      case "keyword_suggestions": {
        if (!keywords.length) {
          throw new Error("Keywords array is required for suggestions");
        }
        
        const data = await makeDataForSEORequest(
          "/keywords_data/google_ads/keywords_for_keywords/live",
          [{
            keywords,
            location_code,
            language_code,
            include_seed_keyword: true,
            sort_by: "search_volume",
          }],
          login,
          password
        );

        const suggestions = data.tasks?.[0]?.result || [];
        result = suggestions.map((item: any) => ({
          keyword: item.keyword,
          volume: item.search_volume || 0,
          cpc: item.cpc || 0,
          competition: item.competition || "UNKNOWN",
          competition_index: item.competition_index || 0,
          monthly_searches: item.monthly_searches || [],
        }));
        break;
      }

      case "search_volume": {
        if (!keywords.length) {
          throw new Error("Keywords array is required for search volume");
        }

        const data = await makeDataForSEORequest(
          "/keywords_data/google_ads/search_volume/live",
          [{
            keywords,
            location_code,
            language_code,
          }],
          login,
          password
        );

        const volumes = data.tasks?.[0]?.result || [];
        result = volumes.map((item: any) => ({
          keyword: item.keyword,
          volume: item.search_volume || 0,
          cpc: item.cpc || 0,
          competition: item.competition || "UNKNOWN",
          monthly_searches: item.monthly_searches || [],
        }));
        break;
      }

      case "keyword_difficulty": {
        if (!keywords.length) {
          throw new Error("Keywords array is required for difficulty check");
        }

        const data = await makeDataForSEORequest(
          "/dataforseo_labs/google/bulk_keyword_difficulty/live",
          [{
            keywords,
            location_code,
            language_code,
          }],
          login,
          password
        );

        const difficulties = data.tasks?.[0]?.result || [];
        result = difficulties.map((item: any) => ({
          keyword: item.keyword,
          difficulty: item.keyword_difficulty || 0,
        }));
        break;
      }

      case "serp_competitors": {
        if (!keywords.length) {
          throw new Error("Keywords array is required for SERP competitors");
        }

        const data = await makeDataForSEORequest(
          "/dataforseo_labs/google/competitors_domain/live",
          [{
            keywords,
            location_code,
            language_code,
            limit,
          }],
          login,
          password
        );

        const competitors = data.tasks?.[0]?.result?.[0]?.items || [];
        result = competitors.map((item: any) => ({
          domain: item.domain,
          avg_position: item.avg_position,
          sum_position: item.sum_position,
          intersections: item.intersections,
          full_domain_metrics: item.full_domain_metrics,
        }));
        break;
      }

      case "competitor_keywords": {
        if (!domain) {
          throw new Error("Domain is required for competitor keywords");
        }

        const data = await makeDataForSEORequest(
          "/dataforseo_labs/google/ranked_keywords/live",
          [{
            target: domain,
            location_code,
            language_code,
            limit,
            order_by: ["keyword_data.keyword_info.search_volume,desc"],
          }],
          login,
          password
        );

        const rankedKeywords = data.tasks?.[0]?.result?.[0]?.items || [];
        result = rankedKeywords.map((item: any) => ({
          keyword: item.keyword_data?.keyword,
          position: item.ranked_serp_element?.serp_item?.rank_group,
          volume: item.keyword_data?.keyword_info?.search_volume || 0,
          cpc: item.keyword_data?.keyword_info?.cpc || 0,
          difficulty: item.keyword_data?.keyword_properties?.keyword_difficulty || 0,
          url: item.ranked_serp_element?.serp_item?.url,
        }));
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    // Update last_checked_at on successful operation
    await supabase
      .from("seo_connections")
      .update({ last_checked_at: new Date().toISOString(), status: "connected", last_error: null })
      .eq("id", connection_id);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("DataForSEO edge function error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

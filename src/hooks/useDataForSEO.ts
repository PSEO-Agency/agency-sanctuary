import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SEOConnection {
  id: string;
  subaccount_id: string;
  provider: string;
  name: string;
  status: string;
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface KeywordSuggestion {
  keyword: string;
  volume: number;
  cpc: number;
  competition: string;
  competition_index: number;
  monthly_searches: { month: number; year: number; search_volume: number }[];
}

export interface KeywordVolume {
  keyword: string;
  volume: number;
  cpc: number;
  competition: string;
}

export interface KeywordDifficulty {
  keyword: string;
  difficulty: number;
}

export interface CompetitorKeyword {
  keyword: string;
  position: number;
  volume: number;
  cpc: number;
  difficulty: number;
  url: string;
}

type DataForSEOOperation = 
  | "keyword_suggestions"
  | "search_volume"
  | "keyword_difficulty"
  | "serp_competitors"
  | "competitor_keywords"
  | "test_connection";

export function useDataForSEO(subaccountId: string | undefined) {
  const [connections, setConnections] = useState<SEOConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!subaccountId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("seo_connections")
        .select("id, subaccount_id, provider, name, status, last_checked_at, last_error, created_at")
        .eq("subaccount_id", subaccountId)
        .eq("provider", "dataforseo");

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error("Error fetching SEO connections:", error);
    } finally {
      setLoading(false);
    }
  }, [subaccountId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const createConnection = async (name: string, login: string, password: string): Promise<SEOConnection | null> => {
    if (!subaccountId) return null;

    setLoading(true);
    try {
      // First create the connection record
      const { data: connection, error: createError } = await supabase
        .from("seo_connections")
        .insert({
          subaccount_id: subaccountId,
          provider: "dataforseo",
          name,
          credentials: { login, password },
          status: "pending",
        })
        .select("id, subaccount_id, provider, name, status, last_checked_at, last_error, created_at")
        .single();

      if (createError) throw createError;

      // Test the connection
      const { data: testResult, error: testError } = await supabase.functions.invoke(
        "dataforseo-keywords",
        {
          body: {
            operation: "test_connection",
            connection_id: connection.id,
          },
        }
      );

      if (testError || !testResult?.success) {
        // Delete the connection if test fails
        await supabase.from("seo_connections").delete().eq("id", connection.id);
        throw new Error(testResult?.error || "Connection test failed");
      }

      // Update status to connected
      await supabase
        .from("seo_connections")
        .update({ status: "connected" })
        .eq("id", connection.id);

      await fetchConnections();
      toast.success(`Connected to DataForSEO (Balance: $${testResult.data.balance.toFixed(2)})`);
      
      return { ...connection, status: "connected" };
    } catch (error) {
      console.error("Error creating connection:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteConnection = async (connectionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("seo_connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;

      setConnections(prev => prev.filter(c => c.id !== connectionId));
      toast.success("Connection removed");
      return true;
    } catch (error) {
      console.error("Error deleting connection:", error);
      toast.error("Failed to remove connection");
      return false;
    }
  };

  const executeOperation = async <T>(
    connectionId: string,
    operation: DataForSEOOperation,
    params: {
      keywords?: string[];
      domain?: string;
      location_code?: number;
      language_code?: string;
      limit?: number;
    } = {}
  ): Promise<T[] | null> => {
    setOperationLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("dataforseo-keywords", {
        body: {
          operation,
          connection_id: connectionId,
          ...params,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Operation failed");

      return data.data as T[];
    } catch (error) {
      console.error(`DataForSEO ${operation} error:`, error);
      toast.error(error instanceof Error ? error.message : "Operation failed");
      return null;
    } finally {
      setOperationLoading(false);
    }
  };

  const getKeywordSuggestions = (connectionId: string, keywords: string[], locationCode = 2840) =>
    executeOperation<KeywordSuggestion>(connectionId, "keyword_suggestions", { keywords, location_code: locationCode });

  const getSearchVolume = (connectionId: string, keywords: string[], locationCode = 2840) =>
    executeOperation<KeywordVolume>(connectionId, "search_volume", { keywords, location_code: locationCode });

  const getKeywordDifficulty = (connectionId: string, keywords: string[], locationCode = 2840) =>
    executeOperation<KeywordDifficulty>(connectionId, "keyword_difficulty", { keywords, location_code: locationCode });

  const getCompetitorKeywords = (connectionId: string, domain: string, locationCode = 2840, limit = 50) =>
    executeOperation<CompetitorKeyword>(connectionId, "competitor_keywords", { 
      domain, 
      location_code: locationCode,
      limit 
    });

  return {
    connections,
    loading,
    operationLoading,
    fetchConnections,
    createConnection,
    deleteConnection,
    getKeywordSuggestions,
    getSearchVolume,
    getKeywordDifficulty,
    getCompetitorKeywords,
  };
}

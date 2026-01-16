import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface CampaignPage {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  meta_title: string | null;
  meta_description: string | null;
  data_values: Record<string, string>;
  sections_content: Json | null;
  keywords: Json | null;
  preview_token: string | null;
  published_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  campaign_id: string;
  subaccount_id: string;
  campaign_name: string;
  pattern_id?: string;
  url_prefix?: string;
}

export interface PageGroup {
  patternId: string;
  urlPrefix: string;
  pattern: string;
  pages: CampaignPage[];
}

export function useAllCampaignPages(subaccountId: string) {
  const [pages, setPages] = useState<CampaignPage[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    if (!subaccountId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch all pages with their campaign info
      const { data, error: fetchError } = await supabase
        .from("campaign_pages")
        .select(`
          id,
          title,
          slug,
          status,
          meta_title,
          meta_description,
          data_values,
          sections_content,
          keywords,
          preview_token,
          published_url,
          published_at,
          created_at,
          updated_at,
          campaign_id,
          subaccount_id,
          campaigns!inner (
            id,
            name
          )
        `)
        .eq("subaccount_id", subaccountId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const mappedPages: CampaignPage[] = (data || []).map((page: any) => {
        const dataValues = (page.data_values || {}) as Record<string, string>;
        return {
          id: page.id,
          title: page.title,
          slug: page.slug,
          status: page.status,
          meta_title: page.meta_title,
          meta_description: page.meta_description,
          data_values: dataValues,
          sections_content: page.sections_content,
          keywords: page.keywords,
          preview_token: page.preview_token,
          published_url: page.published_url,
          published_at: page.published_at,
          created_at: page.created_at,
          updated_at: page.updated_at,
          campaign_id: page.campaign_id,
          subaccount_id: page.subaccount_id,
          campaign_name: page.campaigns?.name || "Unknown Campaign",
          pattern_id: dataValues.patternId,
          url_prefix: dataValues.urlPrefix,
        };
      });

      setPages(mappedPages);

      // Get unique campaigns
      const uniqueCampaigns = Array.from(
        new Map(
          mappedPages.map((p) => [p.campaign_id, { id: p.campaign_id, name: p.campaign_name }])
        ).values()
      );
      setCampaigns(uniqueCampaigns);
    } catch (err) {
      console.error("Error fetching all campaign pages:", err);
      setError("Failed to load pages");
    } finally {
      setLoading(false);
    }
  }, [subaccountId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // Group pages by pattern
  const groupedPages: PageGroup[] = pages.reduce((groups, page) => {
    const patternId = page.pattern_id || "default";
    const existingGroup = groups.find((g) => g.patternId === patternId);
    
    if (existingGroup) {
      existingGroup.pages.push(page);
    } else {
      groups.push({
        patternId,
        urlPrefix: page.url_prefix || "/",
        pattern: patternId === "default" ? "Default Pattern" : patternId,
        pages: [page],
      });
    }
    
    return groups;
  }, [] as PageGroup[]);

  // Filter pages by campaign
  const getPagesByCampaign = (campaignId: string) => {
    return pages.filter((p) => p.campaign_id === campaignId);
  };

  // Filter pages by status
  const getPagesByStatus = (status: string) => {
    if (status === "all") return pages;
    return pages.filter((p) => p.status === status);
  };

  // Search pages
  const searchPages = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(lowerQuery) ||
        p.campaign_name.toLowerCase().includes(lowerQuery) ||
        Object.values(p.data_values).some((v) => 
          v.toLowerCase().includes(lowerQuery)
        )
    );
  };

  return {
    pages,
    campaigns,
    groupedPages,
    loading,
    error,
    refetch: fetchPages,
    getPagesByCampaign,
    getPagesByStatus,
    searchPages,
  };
}

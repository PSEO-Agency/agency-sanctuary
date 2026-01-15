import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CampaignPageDB {
  id: string;
  campaign_id: string;
  subaccount_id: string;
  title: string;
  slug: string | null;
  data_values: Record<string, string>;
  meta_title: string | null;
  meta_description: string | null;
  sections_content: SectionContent[];
  keywords: KeywordData[];
  status: "draft" | "generated" | "reviewed" | "published";
  published_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectionContent {
  id: string;
  name: string;
  type: string;
  content: string;
  generated: boolean;
}

export interface KeywordData {
  keyword: string;
  kd: number;
  volume: number;
  clicks: number;
  selected: boolean;
}

export function useCampaignPages(campaignId: string | null) {
  const [pages, setPages] = useState<CampaignPageDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = async () => {
    if (!campaignId) {
      setPages([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("campaign_pages")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;
      
      // Type assertion with proper handling of JSONB fields
      const typedPages = (data || []).map(page => ({
        ...page,
        data_values: (page.data_values || {}) as unknown as Record<string, string>,
        sections_content: (page.sections_content || []) as unknown as SectionContent[],
        keywords: (page.keywords || []) as unknown as KeywordData[],
      })) as CampaignPageDB[];
      
      setPages(typedPages);
    } catch (err) {
      console.error("Error fetching campaign pages:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch pages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, [campaignId]);

  const updatePage = async (id: string, updates: Partial<CampaignPageDB>): Promise<boolean> => {
    try {
      // Convert to a format compatible with Supabase types
      const dbUpdates = { ...updates } as Record<string, unknown>;
      
      const { error: updateError } = await supabase
        .from("campaign_pages")
        .update(dbUpdates)
        .eq("id", id);

      if (updateError) throw updateError;

      setPages(prev => 
        prev.map(p => p.id === id ? { ...p, ...updates } : p)
      );
      return true;
    } catch (err) {
      console.error("Error updating page:", err);
      toast.error("Failed to update page");
      return false;
    }
  };

  const updatePageSEO = async (
    id: string, 
    metaTitle: string, 
    metaDescription: string
  ): Promise<boolean> => {
    return updatePage(id, { meta_title: metaTitle, meta_description: metaDescription });
  };

  const updatePageContent = async (
    id: string, 
    sections: SectionContent[]
  ): Promise<boolean> => {
    return updatePage(id, { sections_content: sections } as Partial<CampaignPageDB>);
  };

  const updatePageKeywords = async (
    id: string, 
    keywords: KeywordData[]
  ): Promise<boolean> => {
    return updatePage(id, { keywords } as Partial<CampaignPageDB>);
  };

  const updatePageStatus = async (
    id: string, 
    status: CampaignPageDB["status"]
  ): Promise<boolean> => {
    return updatePage(id, { status });
  };

  const deletePage = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("campaign_pages")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setPages(prev => prev.filter(p => p.id !== id));
      toast.success("Page deleted successfully!");
      return true;
    } catch (err) {
      console.error("Error deleting page:", err);
      toast.error("Failed to delete page");
      return false;
    }
  };

  return {
    pages,
    loading,
    error,
    updatePage,
    updatePageSEO,
    updatePageContent,
    updatePageKeywords,
    updatePageStatus,
    deletePage,
    refetch: fetchPages,
  };
}

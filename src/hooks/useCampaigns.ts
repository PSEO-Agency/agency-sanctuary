import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CampaignFormData } from "@/components/campaigns/types";

export interface CampaignDB {
  id: string;
  subaccount_id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "completed";
  business_name: string | null;
  website_url: string | null;
  business_address: string | null;
  business_logo_url: string | null;
  business_type: "saas" | "ecommerce" | "local" | null;
  data_source_type: "csv" | "scratch" | null;
  data_columns: Record<string, string[]>;
  column_mappings: Record<string, string>;
  template_id: string | null;
  template_config: Record<string, unknown>;
  deployment_settings: Record<string, unknown>;
  pages_generated: number;
  total_pages: number;
  clicks: number;
  created_at: string;
  updated_at: string;
}

export function useCampaigns() {
  const { subaccountId } = useParams<{ subaccountId: string }>();
  const [campaigns, setCampaigns] = useState<CampaignDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    if (!subaccountId) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("subaccount_id", subaccountId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      
      // Type assertion since we know the structure matches
      setCampaigns((data || []) as unknown as CampaignDB[]);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [subaccountId]);

  const createCampaign = async (formData: CampaignFormData): Promise<CampaignDB | null> => {
    if (!subaccountId) return null;

    try {
      // Calculate total pages from title patterns
      const totalPages = formData.dataUploadMethod === "scratch"
        ? (formData.titlePatterns || []).reduce((acc, pattern) => {
            const patternLower = pattern.pattern.toLowerCase();
            const usedColumnIds = Object.keys(formData.scratchData).filter(colId =>
              patternLower.includes(`{{${colId.toLowerCase()}}}`)
            );
            if (usedColumnIds.length === 0) return acc;
            const patternPages = usedColumnIds.reduce((pAcc, colId) => {
              return pAcc * (formData.scratchData[colId]?.length || 1);
            }, 1);
            return acc + patternPages;
          }, 0)
        : 0;

      const { data, error: insertError } = await supabase
        .from("campaigns")
        .insert({
          subaccount_id: subaccountId,
          name: formData.businessName || "New Campaign",
          description: `${formData.businessType} campaign with ${formData.selectedTemplate} template.`,
          status: "draft",
          business_name: formData.businessName,
          website_url: formData.websiteUrl,
          business_address: formData.businessAddress,
          business_logo_url: formData.businessLogoPreview || null,
          business_type: formData.businessType as "saas" | "ecommerce" | "local" || null,
          data_source_type: formData.dataUploadMethod,
          data_columns: formData.scratchData,
          column_mappings: formData.columnMappings,
          template_id: formData.selectedTemplate,
          total_pages: totalPages,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newCampaign = data as unknown as CampaignDB;
      
      // Generate pages from combinations if building from scratch
      if (formData.dataUploadMethod === "scratch" && Object.keys(formData.scratchData).length > 0) {
        await generateCampaignPages(newCampaign.id, formData.scratchData);
      }

      setCampaigns(prev => [newCampaign, ...prev]);
      toast.success("Campaign created successfully!");
      return newCampaign;
    } catch (err) {
      console.error("Error creating campaign:", err);
      toast.error("Failed to create campaign");
      return null;
    }
  };

  const generateCampaignPages = async (campaignId: string, dataColumns: Record<string, string[]>) => {
    if (!subaccountId) return;

    const columnKeys = Object.keys(dataColumns);
    const columnValues = Object.values(dataColumns);
    
    if (columnKeys.length === 0 || columnValues.some(v => v.length === 0)) return;

    // Generate all combinations
    const combinations: Record<string, string>[] = [];
    
    const generateCombos = (index: number, current: Record<string, string>) => {
      if (index === columnKeys.length) {
        combinations.push({ ...current });
        return;
      }
      const key = columnKeys[index];
      for (const value of dataColumns[key]) {
        current[key] = value;
        generateCombos(index + 1, current);
      }
    };
    
    generateCombos(0, {});

    // Limit to 200 pages max
    const limitedCombinations = combinations.slice(0, 200);

    // Create page records
    const pages = limitedCombinations.map(combo => {
      const titleParts = Object.values(combo);
      const title = titleParts.join(" in ");
      const slug = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      
      return {
        campaign_id: campaignId,
        subaccount_id: subaccountId,
        title,
        slug,
        data_values: combo,
        status: "draft" as const,
      };
    });

    if (pages.length > 0) {
      const { error: pagesError } = await supabase
        .from("campaign_pages")
        .insert(pages);

      if (pagesError) {
        console.error("Error creating campaign pages:", pagesError);
      }
    }
  };

  const updateCampaign = async (id: string, updates: Partial<CampaignDB>): Promise<boolean> => {
    try {
      // Convert to a format compatible with Supabase types
      const dbUpdates = { ...updates } as Record<string, unknown>;
      
      const { error: updateError } = await supabase
        .from("campaigns")
        .update(dbUpdates)
        .eq("id", id);

      if (updateError) throw updateError;

      setCampaigns(prev => 
        prev.map(c => c.id === id ? { ...c, ...updates } : c)
      );
      toast.success("Campaign updated successfully!");
      return true;
    } catch (err) {
      console.error("Error updating campaign:", err);
      toast.error("Failed to update campaign");
      return false;
    }
  };

  const deleteCampaign = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success("Campaign deleted successfully!");
      return true;
    } catch (err) {
      console.error("Error deleting campaign:", err);
      toast.error("Failed to delete campaign");
      return false;
    }
  };

  return {
    campaigns,
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    refetch: fetchCampaigns,
  };
}

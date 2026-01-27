import { useState, useEffect, useCallback, useRef } from "react";
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
  // New wizard tracking columns
  wizard_step: number;
  is_finalized: boolean;
  wizard_state: CampaignFormData | Record<string, unknown>;
}

export function useCampaigns() {
  const { subaccountId } = useParams<{ subaccountId: string }>();
  const [campaigns, setCampaigns] = useState<CampaignDB[]>([]);
  const [draftCampaigns, setDraftCampaigns] = useState<CampaignDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch only finalized campaigns for the main list
  const fetchCampaigns = async () => {
    if (!subaccountId) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("subaccount_id", subaccountId)
        .eq("is_finalized", true)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      
      setCampaigns((data || []) as unknown as CampaignDB[]);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch campaigns");
    } finally {
      setLoading(false);
    }
  };

  // Fetch unfinished draft campaigns
  const fetchDraftCampaigns = async () => {
    if (!subaccountId) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("subaccount_id", subaccountId)
        .eq("is_finalized", false)
        .order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;
      
      setDraftCampaigns((data || []) as unknown as CampaignDB[]);
    } catch (err) {
      console.error("Error fetching draft campaigns:", err);
    }
  };

  // Fetch a single campaign by ID (for resuming drafts)
  const fetchCampaignById = async (campaignId: string): Promise<CampaignDB | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (fetchError) throw fetchError;
      
      return data as unknown as CampaignDB;
    } catch (err) {
      console.error("Error fetching campaign by ID:", err);
      return null;
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchDraftCampaigns();
  }, [subaccountId]);

  // Save or update a draft campaign at each step
  const saveDraftCampaign = async (
    formData: CampaignFormData, 
    step: number, 
    campaignId?: string
  ): Promise<string | null> => {
    if (!subaccountId) return null;

    try {
      // Prepare wizard_state (remove File objects as they can't be serialized)
      const wizardState = {
        ...formData,
        businessLogo: null, // Can't serialize File objects
        csvFile: null,
      };

      const campaignData = {
        subaccount_id: subaccountId,
        name: formData.businessName || "Untitled Campaign",
        wizard_step: step,
        wizard_state: wizardState as unknown as Record<string, unknown>,
        is_finalized: false,
        business_name: formData.businessName || null,
        website_url: formData.websiteUrl || null,
        business_address: formData.businessAddress || null,
        business_logo_url: formData.businessLogoPreview || null,
        business_type: (formData.businessType as "saas" | "ecommerce" | "local") || null,
        data_source_type: formData.dataUploadMethod,
        updated_at: new Date().toISOString(),
      };

      if (campaignId) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from("campaigns")
          .update(campaignData as any)
          .eq("id", campaignId);

        if (updateError) throw updateError;
        
        // Update local state
        setDraftCampaigns(prev => 
          prev.map(c => c.id === campaignId 
            ? { ...c, ...campaignData, wizard_state: wizardState } as CampaignDB
            : c
          )
        );
        
        return campaignId;
      } else {
        // Create new draft
        const { data, error: insertError } = await supabase
          .from("campaigns")
          .insert({
            ...campaignData,
            status: "draft",
          } as any)
          .select()
          .single();

        if (insertError) throw insertError;
        
        const newCampaign = data as unknown as CampaignDB;
        setDraftCampaigns(prev => [newCampaign, ...prev]);
        
        return newCampaign.id;
      }
    } catch (err) {
      console.error("Error saving draft campaign:", err);
      return null;
    }
  };

  // Finalize a campaign and generate pages
  const finalizeCampaign = async (campaignId: string, formData: CampaignFormData): Promise<CampaignDB | null> => {
    if (!subaccountId) return null;

    try {
      // Calculate total pages from title patterns using dynamic columns
      const totalPages = formData.dataUploadMethod === "scratch"
        ? (formData.titlePatterns || []).reduce((acc, pattern) => {
            const patternLower = pattern.pattern.toLowerCase();
            
            const usedColumns = formData.dynamicColumns.filter(col =>
              patternLower.includes(`{{${col.variableName.toLowerCase()}}}`)
            );
            
            if (usedColumns.length === 0) return acc;
            
            const patternPages = usedColumns.reduce((pAcc, col) => {
              const items = formData.scratchData[col.id] || [];
              return pAcc * (items.length || 1);
            }, 1);
            
            return acc + patternPages;
          }, 0)
        : 0;

      const columnMappings = {
        ...formData.columnMappings,
        dynamicColumns: formData.dynamicColumns,
      };

      const templateConfig = {
        ...(formData.templateContent || {}),
        dynamicColumns: formData.dynamicColumns, // Also save here for easier access
        entities: formData.entities || [],
        entityTemplates: formData.entityTemplates || {},
        titlePatterns: formData.titlePatterns || [],
      };

      const updateData = {
        name: formData.businessName || "New Campaign",
        description: `${formData.businessType} campaign with ${formData.selectedTemplate} template.`,
        status: "draft",
        business_name: formData.businessName,
        website_url: formData.websiteUrl,
        business_address: formData.businessAddress,
        business_logo_url: formData.businessLogoPreview || null,
        business_type: formData.businessType as "saas" | "ecommerce" | "local" || null,
        data_source_type: formData.dataUploadMethod,
        data_columns: formData.scratchData as unknown as Record<string, unknown>,
        column_mappings: columnMappings as unknown as Record<string, unknown>,
        template_id: formData.selectedTemplate,
        template_config: templateConfig as unknown as Record<string, unknown>,
        total_pages: totalPages,
        is_finalized: true,
        wizard_step: 5,
      };

      const { data, error: updateError } = await supabase
        .from("campaigns")
        .update(updateData as any)
        .eq("id", campaignId)
        .select()
        .single();

      if (updateError) throw updateError;

      const finalizedCampaign = data as unknown as CampaignDB;
      
      // Generate pages from combinations if building from scratch
      if (formData.dataUploadMethod === "scratch" && Object.keys(formData.scratchData).length > 0) {
        await generateCampaignPages(campaignId, formData);
      }

      // Move from drafts to finalized list
      setDraftCampaigns(prev => prev.filter(c => c.id !== campaignId));
      setCampaigns(prev => [finalizedCampaign, ...prev]);
      
      toast.success("Campaign created successfully!");
      return finalizedCampaign;
    } catch (err) {
      console.error("Error finalizing campaign:", err);
      toast.error("Failed to create campaign");
      return null;
    }
  };

  const createCampaign = async (formData: CampaignFormData): Promise<CampaignDB | null> => {
    if (!subaccountId) return null;

    try {
      // Calculate total pages from title patterns using dynamic columns
      const totalPages = formData.dataUploadMethod === "scratch"
        ? (formData.titlePatterns || []).reduce((acc, pattern) => {
            const patternLower = pattern.pattern.toLowerCase();
            
            // Find columns whose variable names appear in the pattern
            const usedColumns = formData.dynamicColumns.filter(col =>
              patternLower.includes(`{{${col.variableName.toLowerCase()}}}`)
            );
            
            if (usedColumns.length === 0) return acc;
            
            // Calculate product of all used columns
            const patternPages = usedColumns.reduce((pAcc, col) => {
              const items = formData.scratchData[col.id] || [];
              return pAcc * (items.length || 1);
            }, 1);
            
            return acc + patternPages;
          }, 0)
        : 0;

      // Store dynamic columns in column_mappings for persistence
      const columnMappings = {
        ...formData.columnMappings,
        dynamicColumns: formData.dynamicColumns,
      };

      // Build template_config with entities, dynamicColumns, and entityTemplates
      const templateConfig = {
        ...(formData.templateContent || {}),
        dynamicColumns: formData.dynamicColumns, // Save dynamic columns for Matrix Builder
        entities: formData.entities || [],
        entityTemplates: formData.entityTemplates || {},
        titlePatterns: formData.titlePatterns || [],
      };

      const insertData = {
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
        data_columns: formData.scratchData as unknown as Record<string, unknown>,
        column_mappings: columnMappings as unknown as Record<string, unknown>,
        template_id: formData.selectedTemplate,
        template_config: templateConfig as unknown as Record<string, unknown>,
        total_pages: totalPages,
        is_finalized: true,
      };

      const { data, error: insertError } = await supabase
        .from("campaigns")
        .insert(insertData as any)
        .select()
        .single();

      if (insertError) throw insertError;

      const newCampaign = data as unknown as CampaignDB;
      
      // Generate pages from combinations if building from scratch
      if (formData.dataUploadMethod === "scratch" && Object.keys(formData.scratchData).length > 0) {
        await generateCampaignPages(newCampaign.id, formData);
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

  const generateCampaignPages = async (campaignId: string, formData: CampaignFormData) => {
    if (!subaccountId) return;

    const { dynamicColumns, scratchData, titlePatterns, entities } = formData;
    
    if (dynamicColumns.length === 0 || titlePatterns.length === 0) return;

    const allPages: Array<{
      campaign_id: string;
      subaccount_id: string;
      title: string;
      slug: string;
      data_values: Record<string, string>;
      status: "draft";
    }> = [];

    // Generate pages for each title pattern
    for (const pattern of titlePatterns) {
      const patternLower = pattern.pattern.toLowerCase();
      
      // Get the entity for this pattern
      const entity = (entities || []).find(e => e.id === pattern.entityId);
      const urlPrefix = entity?.urlPrefix || "/";
      
      // Find columns used in this pattern
      const usedColumns = dynamicColumns.filter(col =>
        patternLower.includes(`{{${col.variableName.toLowerCase()}}}`)
      );
      
      if (usedColumns.length === 0) continue;

      // Generate combinations for this pattern only
      const combinations: Record<string, string>[] = [];
      
      const generateCombos = (index: number, current: Record<string, string>) => {
        if (index === usedColumns.length) {
          combinations.push({ ...current });
          return;
        }
        const col = usedColumns[index];
        const values = scratchData[col.id] || [];
        for (const value of values) {
          current[col.variableName] = value;
          generateCombos(index + 1, current);
        }
      };
      
      generateCombos(0, {});

      // Create page records for this pattern
      for (const combo of combinations) {
        // Generate title by replacing variables in pattern
        let title = pattern.pattern;
        Object.entries(combo).forEach(([varName, value]) => {
          const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'gi');
          title = title.replace(regex, value);
        });
        
        // Generate slug using entity's urlPrefix
        const slugTitle = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const slug = `${urlPrefix}${slugTitle}`.replace(/^\/+/, "").replace(/\/+$/, "");
        
        allPages.push({
          campaign_id: campaignId,
          subaccount_id: subaccountId!,
          title,
          slug,
          data_values: { ...combo, patternId: pattern.id, entityId: pattern.entityId },
          status: "draft",
        });
      }
    }

    // Limit to 200 pages max
    const limitedPages = allPages.slice(0, 200);

    if (limitedPages.length > 0) {
      const { error: pagesError } = await supabase
        .from("campaign_pages")
        .insert(limitedPages);

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
      setDraftCampaigns(prev => prev.filter(c => c.id !== id));
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
    draftCampaigns,
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    saveDraftCampaign,
    finalizeCampaign,
    fetchCampaignById,
    refetch: fetchCampaigns,
    refetchDrafts: fetchDraftCampaigns,
  };
}

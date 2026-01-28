/**
 * Campaign Template Resolver
 * Centralized utility for resolving the correct template for campaign pages
 */

import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB } from "@/hooks/useCampaignPages";
import { getTemplateForBusinessType, TemplateSection } from "./campaignTemplates";
import { TemplateStyleConfig, TemplateImagesConfig } from "@/components/campaigns/types";
import { DEFAULT_STYLE_CONFIG, DEFAULT_IMAGES_CONFIG } from "@/components/page-builder/types";

export interface TemplateResolutionResult {
  sections: TemplateSection[];
  style: TemplateStyleConfig;
  images: TemplateImagesConfig;
  source: "entity" | "legacy" | "default";
  entityId?: string;
}

/**
 * Resolve the correct template for a specific campaign page
 * Priority:
 * 1. Entity-specific template from campaign.template_config.entityTemplates
 * 2. First available entity template
 * 3. Legacy template from campaign.template_config.sections
 * 4. Default template based on business type
 */
export function resolveTemplateForPage(
  page: CampaignPageDB,
  campaign: CampaignDB
): TemplateResolutionResult {
  const templateConfig = campaign.template_config as any;
  const entityTemplates = templateConfig?.entityTemplates || {};

  // 1. Try to get entity-specific template using entityId from page data
  const entityId = page.data_values?.entityId;
  if (entityId && entityTemplates[entityId]) {
    const entityTemplate = entityTemplates[entityId];
    return {
      sections: entityTemplate.sections || [],
      style: entityTemplate.style || DEFAULT_STYLE_CONFIG,
      images: entityTemplate.images || DEFAULT_IMAGES_CONFIG,
      source: "entity",
      entityId,
    };
  }

  // 2. Fallback to first available entity template
  const entityTemplateKeys = Object.keys(entityTemplates);
  if (entityTemplateKeys.length > 0) {
    const firstEntityId = entityTemplateKeys[0];
    const firstEntityTemplate = entityTemplates[firstEntityId];
    if (firstEntityTemplate?.sections) {
      return {
        sections: firstEntityTemplate.sections,
        style: firstEntityTemplate.style || DEFAULT_STYLE_CONFIG,
        images: firstEntityTemplate.images || DEFAULT_IMAGES_CONFIG,
        source: "entity",
        entityId: firstEntityId,
      };
    }
  }

  // 3. Fallback to legacy templateContent (direct sections in template_config)
  if (templateConfig?.sections && Array.isArray(templateConfig.sections)) {
    return {
      sections: templateConfig.sections,
      style: templateConfig.style || DEFAULT_STYLE_CONFIG,
      images: templateConfig.images || DEFAULT_IMAGES_CONFIG,
      source: "legacy",
    };
  }

  // 4. Last resort: use default template based on business type
  const defaultTemplate = getTemplateForBusinessType(campaign.business_type || "local");
  return {
    sections: defaultTemplate.sections,
    style: DEFAULT_STYLE_CONFIG,
    images: DEFAULT_IMAGES_CONFIG,
    source: "default",
  };
}

/**
 * Resolve the primary template for a campaign
 * Returns the first entity template or falls back to defaults
 */
export function resolveTemplateForCampaign(campaign: CampaignDB): TemplateResolutionResult {
  const templateConfig = campaign.template_config as any;
  const entityTemplates = templateConfig?.entityTemplates || {};

  // Get first available entity template
  const entityTemplateKeys = Object.keys(entityTemplates);
  if (entityTemplateKeys.length > 0) {
    const firstEntityId = entityTemplateKeys[0];
    const firstEntityTemplate = entityTemplates[firstEntityId];
    if (firstEntityTemplate?.sections) {
      return {
        sections: firstEntityTemplate.sections,
        style: firstEntityTemplate.style || DEFAULT_STYLE_CONFIG,
        images: firstEntityTemplate.images || DEFAULT_IMAGES_CONFIG,
        source: "entity",
        entityId: firstEntityId,
      };
    }
  }

  // Fallback to legacy or default
  if (templateConfig?.sections && Array.isArray(templateConfig.sections)) {
    return {
      sections: templateConfig.sections,
      style: templateConfig.style || DEFAULT_STYLE_CONFIG,
      images: templateConfig.images || DEFAULT_IMAGES_CONFIG,
      source: "legacy",
    };
  }

  const defaultTemplate = getTemplateForBusinessType(campaign.business_type || "local");
  return {
    sections: defaultTemplate.sections,
    style: DEFAULT_STYLE_CONFIG,
    images: DEFAULT_IMAGES_CONFIG,
    source: "default",
  };
}

/**
 * Get all available variables from a campaign's dynamic columns
 */
export function getCampaignVariables(campaign: CampaignDB): { id: string; name: string }[] {
  const templateConfig = campaign.template_config as any;
  const dynamicColumns = templateConfig?.dynamicColumns || 
    (campaign.column_mappings as any)?.dynamicColumns || [];

  if (dynamicColumns.length > 0) {
    return dynamicColumns.map((col: any) => ({
      id: col.variableName || col.id,
      name: col.displayName || col.name,
    }));
  }

  // Fallback to data_columns keys
  const dataColumns = campaign.data_columns as Record<string, string[]> | null;
  if (dataColumns) {
    return Object.keys(dataColumns).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
    }));
  }

  return [];
}

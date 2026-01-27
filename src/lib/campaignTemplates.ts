/**
 * Campaign Template Definitions
 * Default templates for pSEO campaigns
 */

export interface TemplateSection {
  id: string;
  type: "hero" | "features" | "content" | "cta" | "faq" | "testimonials" | "gallery" | "footer" | "pricing" | "pros_cons" | "benefits" | "process" | "image";
  name: string;
  content: Record<string, string | string[]>;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  sections: TemplateSection[];
}

/**
 * Default Local Business Template
 * Designed for service-based local businesses
 */
export const LOCAL_BUSINESS_TEMPLATE: CampaignTemplate = {
  id: "local-business",
  name: "Local Business",
  description: "Perfect for local service businesses targeting geographic areas",
  sections: [
    {
      id: "hero",
      type: "hero",
      name: "Hero Section",
      content: {
        headline: "Best {{service}} Services in {{city}}",
        subheadline: 'prompt("Write a compelling 2-sentence introduction about {{company}} offering {{service}} services in {{city}}. Focus on trust and quality.")',
        cta_text: "Get Free Quote",
        cta_url: "/contact",
      },
    },
    {
      id: "features",
      type: "features",
      name: "Why Choose Us",
      content: {
        title: "Why Choose Our {{service}} Services?",
        items: [
          "Licensed & Insured {{service}} Professionals",
          "24/7 Emergency {{service}} in {{city}}",
          "Free {{service}} Estimates & Consultations",
          "100% Satisfaction Guaranteed",
        ],
      },
    },
    {
      id: "content-main",
      type: "content",
      name: "Main Content",
      content: {
        title: "Professional {{service}} in {{city}}",
        body: 'prompt("Write a detailed 200-word paragraph about {{company}} providing {{service}} services in {{city}}. Include information about experience, expertise, and commitment to customer satisfaction.")',
      },
    },
    {
      id: "cta",
      type: "cta",
      name: "Call to Action",
      content: {
        title: "Ready to Get Started?",
        description: 'prompt("Write a short 1-sentence call-to-action encouraging visitors in {{city}} to contact {{company}} for {{service}} services.")',
        button_text: "Contact Us Today",
        button_url: "/contact",
      },
    },
  ],
};

/**
 * SaaS Template
 * Designed for software comparison and integration pages
 */
export const SAAS_TEMPLATE: CampaignTemplate = {
  id: "saas",
  name: "SaaS Comparison",
  description: "For software comparison and integration landing pages",
  sections: [
    {
      id: "hero",
      type: "hero",
      name: "Hero Section",
      content: {
        headline: "{{product}} vs {{competitor}} - Complete Comparison",
        subheadline: 'prompt("Write a 2-sentence comparison hook for {{product}} vs {{competitor}}. Be objective and highlight the key differentiator.")',
        cta_text: "Start Free Trial",
        cta_url: "/signup",
      },
    },
    {
      id: "features",
      type: "features",
      name: "Feature Comparison",
      content: {
        title: "Key Features Comparison",
        items: [
          "Feature-by-feature breakdown",
          "Pricing comparison",
          "User reviews and ratings",
          "Integration capabilities",
        ],
      },
    },
    {
      id: "content-main",
      type: "content",
      name: "Detailed Analysis",
      content: {
        title: "In-Depth {{product}} vs {{competitor}} Analysis",
        body: 'prompt("Write a comprehensive 250-word comparison between {{product}} and {{competitor}}. Cover pricing, features, user experience, and ideal use cases. Be balanced and objective.")',
      },
    },
  ],
};

/**
 * E-commerce Template
 * Designed for product category and location-based pages
 */
export const ECOMMERCE_TEMPLATE: CampaignTemplate = {
  id: "ecommerce",
  name: "E-commerce Category",
  description: "For product category and location-based landing pages",
  sections: [
    {
      id: "hero",
      type: "hero",
      name: "Hero Section",
      content: {
        headline: "Buy {{product}} Online - Fast Shipping to {{location}}",
        subheadline: 'prompt("Write a compelling 2-sentence value proposition for buying {{product}} with delivery to {{location}}. Focus on convenience and quality.")',
        cta_text: "Shop Now",
        cta_url: "/products",
      },
    },
    {
      id: "features",
      type: "features",
      name: "Why Shop With Us",
      content: {
        title: "Why Buy {{product}} From Us?",
        items: [
          "Fast & Free Shipping",
          "30-Day Money Back Guarantee",
          "Authentic Products Only",
          "Expert Customer Support",
        ],
      },
    },
    {
      id: "content-main",
      type: "content",
      name: "Product Description",
      content: {
        title: "Premium {{product}} Selection",
        body: 'prompt("Write a 200-word product category description for {{product}} available for purchase with shipping to {{location}}. Highlight quality, selection, and value.")',
      },
    },
  ],
};

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): CampaignTemplate | null {
  const templates: Record<string, CampaignTemplate> = {
    "local-business": LOCAL_BUSINESS_TEMPLATE,
    "saas": SAAS_TEMPLATE,
    "ecommerce": ECOMMERCE_TEMPLATE,
  };
  
  return templates[templateId] || null;
}

/**
 * Get all available templates
 */
export function getAllTemplates(): CampaignTemplate[] {
  return [LOCAL_BUSINESS_TEMPLATE, SAAS_TEMPLATE, ECOMMERCE_TEMPLATE];
}

/**
 * Get template for a business type
 */
export function getTemplateForBusinessType(businessType: string): CampaignTemplate {
  switch (businessType) {
    case "saas":
      return SAAS_TEMPLATE;
    case "ecommerce":
      return ECOMMERCE_TEMPLATE;
    case "local":
    default:
      return LOCAL_BUSINESS_TEMPLATE;
  }
}

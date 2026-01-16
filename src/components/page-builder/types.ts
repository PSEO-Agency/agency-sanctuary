import { TemplateSection } from "@/lib/campaignTemplates";
import { TemplateStyleConfig, TemplateImagesConfig } from "@/components/campaigns/types";
import { SectionContent } from "@/hooks/useCampaignPages";

export type ViewportSize = "desktop" | "tablet" | "mobile";

export interface UnifiedPageBuilderProps {
  // Template data
  sections: TemplateSection[];
  styleConfig: TemplateStyleConfig;
  imagesConfig: TemplateImagesConfig;
  
  // Page data
  dataValues: Record<string, string>;
  generatedContent?: SectionContent[];
  
  // Mode settings
  mode: "template" | "page"; // template = onboarding, page = campaign page editor
  isEditable?: boolean;
  
  // Callbacks
  onSectionUpdate?: (sectionId: string, field: string, value: string | string[]) => void;
  onStyleUpdate?: (config: TemplateStyleConfig) => void;
  onImagesUpdate?: (config: TemplateImagesConfig) => void;
  onAddSection?: (section: TemplateSection) => void;
  onRemoveSection?: (sectionId: string) => void;
  onReorderSections?: (newOrder: TemplateSection[]) => void;
  
  // Field editing for page mode
  onFieldEdit?: (sectionId: string, fieldName: string, value: string) => void;
  
  // Visual mode selection
  onSectionSelect?: (sectionId: string) => void;
  selectedSection?: string | null;
  
  // Panel visibility
  showBlocksPanel?: boolean;
  showSettingsPanel?: boolean;
  
  // Viewport
  viewport?: ViewportSize;
  onViewportChange?: (viewport: ViewportSize) => void;
}

export interface BlockDefinition {
  id: string;
  type: TemplateSection["type"];
  name: string;
  description: string;
  icon: string;
  defaultContent: Record<string, string | string[]>;
}

// Available block types
export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    id: "hero-block",
    type: "hero",
    name: "Hero Section",
    description: "Main banner with headline and CTA",
    icon: "Layout",
    defaultContent: {
      headline: "Your Main Headline Here",
      subheadline: "A compelling subtitle that supports your main message",
      cta_text: "Get Started",
    },
  },
  {
    id: "features-block",
    type: "features",
    name: "Features Grid",
    description: "Showcase key features or benefits",
    icon: "Grid3x3",
    defaultContent: {
      title: "Why Choose Us",
      items: ["Feature One", "Feature Two", "Feature Three", "Feature Four"],
    },
  },
  {
    id: "content-block",
    type: "content",
    name: "Content Block",
    description: "Rich text content section",
    icon: "FileText",
    defaultContent: {
      title: "Section Title",
      body: "Add your detailed content here. This section is perfect for explaining your services, products, or value proposition in more detail.",
    },
  },
  {
    id: "cta-block",
    type: "cta",
    name: "Call to Action",
    description: "Conversion-focused CTA section",
    icon: "MousePointerClick",
    defaultContent: {
      title: "Ready to Get Started?",
      description: "Take the next step and transform your business today.",
      button_text: "Contact Us",
    },
  },
  {
    id: "faq-block",
    type: "faq",
    name: "FAQ Section",
    description: "Frequently asked questions",
    icon: "HelpCircle",
    defaultContent: {
      title: "Frequently Asked Questions",
      items: ["Question one?", "Question two?", "Question three?"],
    },
  },
  {
    id: "testimonials-block",
    type: "testimonials",
    name: "Testimonials",
    description: "Customer reviews and quotes",
    icon: "Quote",
    defaultContent: {
      title: "What Our Customers Say",
      items: ["Great service!", "Highly recommended", "Five stars"],
    },
  },
];

export const DEFAULT_STYLE_CONFIG: TemplateStyleConfig = {
  primaryColor: "#8B5CF6",
  backgroundColor: "#FFFFFF",
  typography: "Inter",
  buttonStyle: "rounded",
  buttonFill: "solid",
  darkMode: false,
};

export const DEFAULT_IMAGES_CONFIG: TemplateImagesConfig = {
  sectionImages: [],
};

export interface BusinessType {
  id: string;
  name: string;
  columns: ColumnConfig[];
}

export interface ColumnConfig {
  id: string;
  name: string;
  placeholder: string;
}

export interface TemplateStyleConfig {
  primaryColor: string;
  backgroundColor: string;
  typography: string;
  buttonStyle: "rounded" | "square";
  buttonFill: "solid" | "outline" | "ghost";
  darkMode: boolean;
}

export interface TemplateImagesConfig {
  logo?: { url: string; size: number };
  heroImage?: { url: string; position: string };
  sectionImages: Array<{ id: string; url: string }>;
  favicon?: string;
}

export interface TemplateContentConfig {
  sections: Array<{
    id: string;
    type: string;
    name: string;
    content: Record<string, string | string[]>;
  }>;
  style?: TemplateStyleConfig;
  images?: TemplateImagesConfig;
}

export interface CampaignFormData {
  // Step 1: Business Details
  businessName: string;
  websiteUrl: string;
  businessAddress: string;
  businessLogo: File | null;
  businessLogoPreview: string;
  businessType: string;

  // Step 2: Data Upload Method
  dataUploadMethod: "csv" | "scratch" | null;

  // Step 3A: CSV Upload
  csvFile: File | null;
  csvFileName: string;
  csvFileSize: string;
  csvUploadDate: string;
  columnMappings: Record<string, string>;
  csvColumns: string[];

  // Step 3B: Build From Scratch
  scratchData: Record<string, string[]>;
  generatedTitles: GeneratedTitle[];
  titlePattern: string; // e.g., "{{service}} in {{city}}"

  // Step 4: Template Selection
  selectedTemplate: string;

  // Step 5: Template Editor
  templateContent?: TemplateContentConfig;
}

export interface GeneratedTitle {
  id: string;
  title: string;
  language: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: "Active" | "Draft" | "Paused";
  description: string;
  pagesGenerated: number;
  totalPages: number;
  clicks: string;
  businessType: string;
  template: string;
  createdAt: string;
}

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: "saas",
    name: "SaaS",
    columns: [
      { id: "features", name: "Features", placeholder: "Add Feature" },
      { id: "useCases", name: "Use Cases", placeholder: "Add Use Case" },
      { id: "integrations", name: "Integrations", placeholder: "Add Integration" },
    ],
  },
  {
    id: "ecommerce",
    name: "Ecommerce",
    columns: [
      { id: "products", name: "Products", placeholder: "Add Product" },
      { id: "categories", name: "Categories", placeholder: "Add Category" },
      { id: "locations", name: "Locations", placeholder: "Add Location" },
    ],
  },
  {
    id: "local",
    name: "Local business",
    columns: [
      { id: "services", name: "Services", placeholder: "Add Service" },
      { id: "cities", name: "Cities", placeholder: "Add City" },
      { id: "languages", name: "Languages", placeholder: "Add Language" },
    ],
  },
];

export const TEMPLATES = [
  {
    id: "modern-local",
    name: "Modern Local",
    description: "Optimized for service-based businesses.",
    preview: "Modern Local Template",
  },
  {
    id: "clean-saas",
    name: "Clean SaaS",
    description: "Perfect for software and tech companies.",
    preview: "Clean SaaS Template",
  },
  {
    id: "professional",
    name: "Professional",
    description: "Corporate style for B2B services.",
    preview: "Professional Template",
  },
  {
    id: "creative-agency",
    name: "Creative Agency",
    description: "Bold design for creative services.",
    preview: "Creative Agency Template",
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Designed for online stores and retail.",
    preview: "E-commerce Template",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Create your own template",
    preview: "Minimal Template",
  },
];

export const REQUIRED_FIELDS = [
  { id: "serviceName", name: "Service Name", required: true },
  { id: "city", name: "City", required: true },
  { id: "language", name: "Language", required: true },
];

export const initialFormData: CampaignFormData = {
  businessName: "",
  websiteUrl: "",
  businessAddress: "",
  businessLogo: null,
  businessLogoPreview: "",
  businessType: "",
  dataUploadMethod: null,
  csvFile: null,
  csvFileName: "",
  csvFileSize: "",
  csvUploadDate: "",
  columnMappings: {},
  csvColumns: [],
  scratchData: {},
  generatedTitles: [],
  titlePattern: "",
  selectedTemplate: "",
  templateContent: undefined,
};

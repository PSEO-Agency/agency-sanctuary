import { useMemo } from "react";
import { parseStaticPlaceholders } from "@/lib/templateParser";
import { getTemplateById } from "@/lib/campaignTemplates";

interface CampaignPage {
  id: string;
  title: string;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  sections_content: any;
  data_values: Record<string, string>;
  campaign_id: string;
  preview_token: string;
}

interface Campaign {
  id: string;
  name: string;
  business_name: string | null;
  business_logo_url: string | null;
  template_config: any;
  preview_settings: any;
  data_columns: any;
}

interface PreviewPageContentProps {
  page: CampaignPage;
  campaign: Campaign | null;
}

interface FieldContent {
  original: string;
  rendered: string;
  isPrompt: boolean;
  generated?: string;
}

interface SectionContent {
  id: string;
  fields: Record<string, FieldContent>;
}

export default function PreviewPageContent({ page, campaign }: PreviewPageContentProps) {
  const dataValues = page.data_values || {};
  const generatedContent: SectionContent[] = page.sections_content || [];
  
  // Get template for structure
  const templateId = campaign?.template_config?.templateId || "local-business";
  const template = getTemplateById(templateId);
  const sections = template?.sections || [];

  // Helper to get field content with placeholder resolution
  const getFieldContent = (sectionId: string, fieldName: string): string => {
    const section = generatedContent.find(s => s.id === sectionId);
    if (section?.fields?.[fieldName]) {
      const field = section.fields[fieldName];
      if (field.isPrompt && field.generated) {
        return parseStaticPlaceholders(field.generated, dataValues);
      }
      return parseStaticPlaceholders(field.rendered || field.original || "", dataValues);
    }
    
    // Fallback to template
    const templateSection = sections.find((s: any) => s.id === sectionId);
    if (templateSection?.content?.[fieldName]) {
      const content = templateSection.content[fieldName];
      if (typeof content === 'string') {
        return parseStaticPlaceholders(content, dataValues);
      }
    }
    
    return "";
  };

  // Helper to get array field items
  const getFieldItems = (sectionId: string, fieldName: string): string[] => {
    const section = generatedContent.find(s => s.id === sectionId);
    if (section?.fields?.[fieldName]) {
      const field = section.fields[fieldName];
      try {
        const items = JSON.parse(field.rendered || field.original || "[]");
        if (Array.isArray(items)) {
          return items.map(item => parseStaticPlaceholders(String(item), dataValues));
        }
      } catch {
        if (field.rendered) {
          return field.rendered.split('\n').filter(Boolean).map(item => 
            parseStaticPlaceholders(item, dataValues)
          );
        }
      }
    }
    
    // Fallback to template
    const templateSection = sections.find((s: any) => s.id === sectionId);
    if (templateSection?.content?.[fieldName]) {
      const content = templateSection.content[fieldName];
      if (Array.isArray(content)) {
        return content.map((item: string) => parseStaticPlaceholders(item, dataValues));
      }
    }
    
    return [];
  };

  // Render section by type
  const renderSection = (sectionId: string, sectionType: string, index: number) => {
    switch (sectionType) {
      case "hero":
        return (
          <section key={sectionId} className="relative py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-primary/5">
            <div className="container">
              <div className="max-w-4xl mx-auto text-center space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                  {getFieldContent(sectionId, "headline")}
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                  {getFieldContent(sectionId, "subheadline")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                    {getFieldContent(sectionId, "ctaText") || "Get Started"}
                  </button>
                  <button className="px-8 py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors">
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </section>
        );

      case "features":
        const featureItems = getFieldItems(sectionId, "items");
        return (
          <section key={sectionId} className="py-16 md:py-24 bg-muted/30">
            <div className="container">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
                {getFieldContent(sectionId, "title")}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featureItems.map((item, i) => (
                  <div 
                    key={i} 
                    className="p-6 bg-background rounded-xl border shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-primary font-bold text-lg">{i + 1}</span>
                    </div>
                    <p className="text-foreground font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case "content":
        return (
          <section key={sectionId} className="py-16 md:py-24">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-8 text-foreground">
                  {getFieldContent(sectionId, "title")}
                </h2>
                <div className="prose prose-lg max-w-none text-muted-foreground">
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {getFieldContent(sectionId, "body")}
                  </p>
                </div>
              </div>
            </div>
          </section>
        );

      case "cta":
        return (
          <section key={sectionId} className="py-16 md:py-24 bg-primary text-primary-foreground">
            <div className="container">
              <div className="max-w-3xl mx-auto text-center space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold">
                  {getFieldContent(sectionId, "headline")}
                </h2>
                <p className="text-lg opacity-90">
                  {getFieldContent(sectionId, "subtext")}
                </p>
                <button className="px-8 py-3 bg-background text-foreground rounded-lg font-medium hover:bg-background/90 transition-colors">
                  {getFieldContent(sectionId, "buttonText") || "Contact Us"}
                </button>
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-[60vh]">
      {sections.map((section: any, index: number) => 
        renderSection(section.id, section.type, index)
      )}
    </div>
  );
}

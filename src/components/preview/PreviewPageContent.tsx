import { useMemo } from "react";
import { parseStaticPlaceholders } from "@/lib/templateParser";
import { getTemplateById } from "@/lib/campaignTemplates";
import { Check, X, CheckCircle, XCircle, Star, ArrowRight, ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  const renderSection = (sectionId: string, sectionType: string, sectionName: string, index: number) => {
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
                    {getFieldContent(sectionId, "cta_text") || getFieldContent(sectionId, "ctaText") || "Get Started"}
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
                      <Check className="h-6 w-6 text-primary" />
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
                  {getFieldContent(sectionId, "headline") || getFieldContent(sectionId, "title")}
                </h2>
                <p className="text-lg opacity-90">
                  {getFieldContent(sectionId, "subtext") || getFieldContent(sectionId, "description")}
                </p>
                <button className="px-8 py-3 bg-background text-foreground rounded-lg font-medium hover:bg-background/90 transition-colors">
                  {getFieldContent(sectionId, "buttonText") || getFieldContent(sectionId, "button_text") || getFieldContent(sectionId, "cta_text") || "Contact Us"}
                </button>
              </div>
            </div>
          </section>
        );

      case "faq":
        const faqItems = getFieldItems(sectionId, "items");
        return (
          <section key={sectionId} className="py-16 md:py-24">
            <div className="container">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
                  {getFieldContent(sectionId, "title") || "Frequently Asked Questions"}
                </h2>
                <Accordion type="single" collapsible className="space-y-4">
                  {faqItems.map((item, i) => {
                    const parts = item.split('|').map(s => s.trim());
                    const question = parts[0]?.replace(/^Q:\s*/i, '') || item;
                    const answer = parts[1]?.replace(/^A:\s*/i, '') || "";
                    return (
                      <AccordionItem
                        key={i}
                        value={`item-${i}`}
                        className="rounded-lg border bg-background px-4"
                      >
                        <AccordionTrigger className="text-left font-medium py-4 hover:no-underline">
                          {question}
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 text-muted-foreground">
                          {answer}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </div>
          </section>
        );

      case "pricing":
        const priceFeatures = getFieldItems(sectionId, "features");
        return (
          <section key={sectionId} className="py-16 md:py-24 bg-muted/30">
            <div className="container">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-8 text-foreground">
                  {getFieldContent(sectionId, "title") || "Pricing"}
                </h2>
                <div className="bg-background rounded-xl p-8 shadow-lg border">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {getFieldContent(sectionId, "price") || "$X,XXX"}
                  </div>
                  {getFieldContent(sectionId, "description") && (
                    <p className="text-muted-foreground mb-6">
                      {getFieldContent(sectionId, "description")}
                    </p>
                  )}
                  {priceFeatures.length > 0 && (
                    <ul className="text-left space-y-2 mb-6">
                      {priceFeatures.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                    {getFieldContent(sectionId, "cta_text") || "Get Quote"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        );

      case "pros_cons":
        const pros = getFieldItems(sectionId, "pros");
        const cons = getFieldItems(sectionId, "cons");
        return (
          <section key={sectionId} className="py-16 md:py-24">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
                  {getFieldContent(sectionId, "title") || "Pros & Cons"}
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" /> Pros
                    </h3>
                    <ul className="space-y-3">
                      {pros.map((pro, i) => (
                        <li key={i} className="flex items-start gap-2 text-green-800 dark:text-green-300">
                          <Check className="h-4 w-4 mt-1 shrink-0" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                      <XCircle className="h-5 w-5" /> Cons
                    </h3>
                    <ul className="space-y-3">
                      {cons.map((con, i) => (
                        <li key={i} className="flex items-start gap-2 text-red-800 dark:text-red-300">
                          <X className="h-4 w-4 mt-1 shrink-0" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case "testimonials":
        const testimonialItems = getFieldItems(sectionId, "items");
        return (
          <section key={sectionId} className="py-16 md:py-24 bg-muted/30">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
                  {getFieldContent(sectionId, "title") || "What Our Customers Say"}
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {testimonialItems.map((item, i) => {
                    const parts = item.split('|').map(s => s.trim());
                    const quote = parts[0] || item;
                    const author = parts[1] || "Happy Customer";
                    return (
                      <div key={i} className="bg-background rounded-xl p-6 border">
                        <div className="flex gap-1 mb-3">
                          {[...Array(5)].map((_, j) => (
                            <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="italic text-muted-foreground mb-4">"{quote}"</p>
                        <p className="font-medium text-foreground">— {author}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        );

      case "benefits":
        const benefitItems = getFieldItems(sectionId, "items");
        return (
          <section key={sectionId} className="py-16 md:py-24">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
                  {getFieldContent(sectionId, "title") || "Benefits"}
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {benefitItems.map((item, i) => (
                    <div key={i} className="text-center p-6 rounded-xl border bg-background">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Check className="h-6 w-6 text-primary" />
                      </div>
                      <p className="font-medium text-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );

      case "process":
        const steps = getFieldItems(sectionId, "steps");
        return (
          <section key={sectionId} className="py-16 md:py-24 bg-muted/30">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
                  {getFieldContent(sectionId, "title") || "How It Works"}
                </h2>
                <div className="space-y-6">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 bg-background rounded-lg border">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{step}</p>
                      </div>
                      {i < steps.length - 1 && (
                        <ArrowRight className="h-5 w-5 text-primary mt-2 hidden md:block" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );

      case "gallery":
        const images = getFieldItems(sectionId, "images");
        return (
          <section key={sectionId} className="py-16 md:py-24">
            <div className="container">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
                  {getFieldContent(sectionId, "title") || "Gallery"}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden border bg-muted">
                      {image.startsWith('http') ? (
                        <img src={image} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-4 text-center">
                          <span className="text-sm text-muted-foreground">{image}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );

      case "image":
        const imageSrc = getFieldContent(sectionId, "src");
        const imageAlt = getFieldContent(sectionId, "alt") || "Image";
        return (
          <section key={sectionId} className="py-12 md:py-16">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                {imageSrc?.startsWith('http') ? (
                  <img src={imageSrc} alt={imageAlt} className="w-full rounded-xl shadow-lg" />
                ) : (
                  <div className="aspect-video rounded-xl border bg-muted flex items-center justify-center">
                    <span className="text-center px-8 text-muted-foreground">
                      {imageSrc || "[Image placeholder]"}
                    </span>
                  </div>
                )}
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
        renderSection(section.id, section.type, section.name, index)
      )}
    </div>
  );
}

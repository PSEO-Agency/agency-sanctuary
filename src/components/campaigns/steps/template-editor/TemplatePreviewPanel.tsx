import { TemplateSection } from "@/lib/campaignTemplates";
import { TemplateStyleConfig, TemplateImagesConfig } from "../../types";
import { ViewportSize } from "../TemplateEditorStep";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, X, CheckCircle, XCircle, Star, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface TemplatePreviewPanelProps {
  sections: TemplateSection[];
  styleConfig: TemplateStyleConfig;
  imagesConfig: TemplateImagesConfig;
  sampleData: Record<string, string>;
  viewport: ViewportSize;
}

export function TemplatePreviewPanel({
  sections,
  styleConfig,
  imagesConfig,
  sampleData,
  viewport,
}: TemplatePreviewPanelProps) {
  // Replace placeholders with sample data
  const resolvePlaceholder = (text: string): string => {
    if (!text) return "";
    let resolved = text;
    
    // Handle image_prompt syntax
    if (text.includes('image_prompt("') || text.includes("image_prompt('")) {
      const match = text.match(/image_prompt\(["'](.*)["']\)/);
      if (match) {
        const promptContent = match[1];
        // Replace variables in the prompt
        let resolvedPrompt = promptContent;
        Object.entries(sampleData).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
          resolvedPrompt = resolvedPrompt.replace(regex, value);
        });
        return `[Image: ${resolvedPrompt.substring(0, 60)}...]`;
      }
    }
    
    // Skip if it's a prompt
    if (text.startsWith('prompt("') || text.startsWith("prompt('")) {
      const match = text.match(/prompt\(["'](.*)["']\)/);
      const promptContent = match ? match[1] : "";
      // Show a preview of the prompt content with resolved placeholders
      let resolvedPrompt = promptContent;
      Object.entries(sampleData).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
        resolvedPrompt = resolvedPrompt.replace(regex, value);
      });
      return `[AI Generated: ${resolvedPrompt.substring(0, 80)}...]`;
    }
    
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
      resolved = resolved.replace(regex, value);
    });
    return resolved;
  };

  // Parse array items (handles JSON strings and plain arrays)
  const parseArrayItems = (items: string | string[] | undefined): string[] => {
    if (!items) return [];
    if (Array.isArray(items)) return items;
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return items.split('\n').filter(Boolean);
    }
  };

  const getViewportWidth = () => {
    switch (viewport) {
      case "mobile":
        return "w-[375px]";
      case "tablet":
        return "w-[768px]";
      default:
        return "w-full max-w-[1200px]";
    }
  };

  const getButtonClasses = () => {
    const base = "inline-flex items-center justify-center px-6 py-3 font-medium transition-colors";
    const rounded = styleConfig.buttonStyle === "rounded" ? "rounded-full" : "rounded-lg";
    
    let fillStyle = "";
    if (styleConfig.buttonFill === "solid") {
      fillStyle = "text-white";
    } else if (styleConfig.buttonFill === "outline") {
      fillStyle = "bg-transparent border-2";
    } else {
      fillStyle = "bg-transparent";
    }
    
    return cn(base, rounded, fillStyle);
  };

  const renderSection = (section: TemplateSection) => {
    const content = section.content;

    switch (section.type) {
      case "hero":
        return (
          <div
            key={section.id}
            className="relative py-20 px-8"
            style={{
              backgroundColor: styleConfig.darkMode ? "#1a1a2e" : styleConfig.backgroundColor,
            }}
          >
            {imagesConfig.heroImage?.url && (
              <div className="absolute inset-0 opacity-20">
                <img
                  src={imagesConfig.heroImage.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
              {imagesConfig.logo?.url && (
                <img
                  src={imagesConfig.logo.url}
                  alt="Logo"
                  className="h-12 mx-auto mb-8"
                  style={{ transform: `scale(${(imagesConfig.logo.size || 50) / 50})` }}
                />
              )}
              <h1
                className="text-4xl md:text-5xl font-bold"
                style={{
                  fontFamily: styleConfig.typography,
                  color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                }}
              >
                {resolvePlaceholder(content.headline as string)}
              </h1>
              {content.subheadline && (
                <p
                  className="text-lg opacity-80"
                  style={{
                    fontFamily: styleConfig.typography,
                    color: styleConfig.darkMode ? "#e0e0e0" : "#4a4a4a",
                  }}
                >
                  {resolvePlaceholder(content.subheadline as string)}
                </p>
              )}
              {content.cta_text && (
                <button
                  className={getButtonClasses()}
                  style={{
                    backgroundColor: styleConfig.buttonFill === "solid" ? styleConfig.primaryColor : "transparent",
                    borderColor: styleConfig.primaryColor,
                    color: styleConfig.buttonFill === "solid" ? "#ffffff" : styleConfig.primaryColor,
                  }}
                >
                  {resolvePlaceholder(content.cta_text as string)}
                </button>
              )}
            </div>
          </div>
        );

      case "features":
        const featureItems = parseArrayItems(content.items as string[] | string);
        return (
          <div
            key={section.id}
            className="py-16 px-8"
            style={{
              backgroundColor: styleConfig.darkMode ? "#16162a" : "#f8f9fa",
            }}
          >
            <div className="max-w-4xl mx-auto">
              <h2
                className="text-2xl md:text-3xl font-bold text-center mb-10"
                style={{
                  fontFamily: styleConfig.typography,
                  color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                }}
              >
                {resolvePlaceholder(content.title as string)}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featureItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 rounded-lg"
                    style={{
                      backgroundColor: styleConfig.darkMode ? "#1a1a2e" : "#ffffff",
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: styleConfig.primaryColor }}
                    >
                      ✓
                    </div>
                    <span
                      style={{
                        fontFamily: styleConfig.typography,
                        color: styleConfig.darkMode ? "#e0e0e0" : "#4a4a4a",
                      }}
                    >
                      {resolvePlaceholder(item)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "content":
        return (
          <div
            key={section.id}
            className="py-16 px-8"
            style={{
              backgroundColor: styleConfig.darkMode ? "#1a1a2e" : styleConfig.backgroundColor,
            }}
          >
            <div className="max-w-3xl mx-auto">
              <h2
                className="text-2xl md:text-3xl font-bold mb-6"
                style={{
                  fontFamily: styleConfig.typography,
                  color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                }}
              >
                {resolvePlaceholder(content.title as string)}
              </h2>
              <p
                className="text-lg leading-relaxed opacity-80"
                style={{
                  fontFamily: styleConfig.typography,
                  color: styleConfig.darkMode ? "#e0e0e0" : "#4a4a4a",
                }}
              >
                {resolvePlaceholder(content.body as string)}
              </p>
            </div>
          </div>
        );

      case "cta":
        return (
          <div
            key={section.id}
            className="py-16 px-8 text-center"
            style={{
              backgroundColor: styleConfig.primaryColor,
            }}
          >
            <div className="max-w-2xl mx-auto space-y-6">
              <h2
                className="text-2xl md:text-3xl font-bold text-white"
                style={{ fontFamily: styleConfig.typography }}
              >
                {resolvePlaceholder((content.title || content.headline) as string)}
              </h2>
              {(content.description || content.subtext) && (
                <p
                  className="text-lg text-white/90"
                  style={{ fontFamily: styleConfig.typography }}
                >
                  {resolvePlaceholder((content.description || content.subtext) as string)}
                </p>
              )}
              {(content.button_text || content.cta_text) && (
                <button
                  className={cn(getButtonClasses(), "bg-white")}
                  style={{
                    color: styleConfig.primaryColor,
                    borderColor: "#ffffff",
                  }}
                >
                  {resolvePlaceholder((content.button_text || content.cta_text) as string)}
                </button>
              )}
            </div>
          </div>
        );

      case "faq":
        const faqItems = parseArrayItems(content.items as string[] | string);
        return (
          <div
            key={section.id}
            className="py-16 px-8"
            style={{
              backgroundColor: styleConfig.darkMode ? "#1a1a2e" : styleConfig.backgroundColor,
            }}
          >
            <div className="max-w-3xl mx-auto">
              <h2
                className="text-2xl md:text-3xl font-bold text-center mb-10"
                style={{
                  fontFamily: styleConfig.typography,
                  color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                }}
              >
                {resolvePlaceholder(content.title as string || "Frequently Asked Questions")}
              </h2>
              <Accordion type="single" collapsible className="space-y-4">
                {faqItems.map((item, index) => {
                  // Items can be "Q: ... | A: ..." format, "question|answer" format, or just questions
                  const parts = item.split('|').map(s => s.trim());
                  const question = parts[0]?.replace(/^Q:\s*/i, '') || item;
                  const answer = parts[1]?.replace(/^A:\s*/i, '') || `[AI will generate answer for: ${question}]`;
                  return (
                    <AccordionItem
                      key={index}
                      value={`item-${index}`}
                      className="rounded-lg border px-4"
                      style={{
                        backgroundColor: styleConfig.darkMode ? "#16162a" : "#ffffff",
                        borderColor: styleConfig.darkMode ? "#2a2a4e" : "#e5e5e5",
                      }}
                    >
                      <AccordionTrigger
                        className="text-left font-medium py-4 hover:no-underline"
                        style={{
                          fontFamily: styleConfig.typography,
                          color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                        }}
                      >
                        {resolvePlaceholder(question)}
                      </AccordionTrigger>
                      <AccordionContent
                        className="pb-4"
                        style={{
                          fontFamily: styleConfig.typography,
                          color: styleConfig.darkMode ? "#e0e0e0" : "#4a4a4a",
                        }}
                      >
                        {resolvePlaceholder(answer)}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>
        );

      case "pricing":
        return (
          <div
            key={section.id}
            className="py-16 px-8"
            style={{
              backgroundColor: styleConfig.darkMode ? "#16162a" : "#f8f9fa",
            }}
          >
            <div className="max-w-2xl mx-auto text-center">
              <h2
                className="text-2xl md:text-3xl font-bold mb-8"
                style={{
                  fontFamily: styleConfig.typography,
                  color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                }}
              >
                {resolvePlaceholder(content.title as string || "Pricing")}
              </h2>
              <div
                className="rounded-xl p-8 shadow-lg border"
                style={{
                  backgroundColor: styleConfig.darkMode ? "#1a1a2e" : "#ffffff",
                  borderColor: styleConfig.darkMode ? "#2a2a4e" : "#e5e5e5",
                }}
              >
                <div
                  className="text-4xl font-bold mb-2"
                  style={{ color: styleConfig.primaryColor }}
                >
                  {resolvePlaceholder(content.price as string || "$X,XXX")}
                </div>
                {content.description && (
                  <p
                    className="mb-6 opacity-80"
                    style={{
                      fontFamily: styleConfig.typography,
                      color: styleConfig.darkMode ? "#e0e0e0" : "#4a4a4a",
                    }}
                  >
                    {resolvePlaceholder(content.description as string)}
                  </p>
                )}
                {content.features && (
                  <ul className="text-left space-y-2 mb-6">
                    {parseArrayItems(content.features as string[] | string).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4" style={{ color: styleConfig.primaryColor }} />
                        <span
                          style={{
                            color: styleConfig.darkMode ? "#e0e0e0" : "#4a4a4a",
                          }}
                        >
                          {resolvePlaceholder(feature)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  className={getButtonClasses()}
                  style={{
                    backgroundColor: styleConfig.buttonFill === "solid" ? styleConfig.primaryColor : "transparent",
                    borderColor: styleConfig.primaryColor,
                    color: styleConfig.buttonFill === "solid" ? "#ffffff" : styleConfig.primaryColor,
                  }}
                >
                  {resolvePlaceholder(content.cta_text as string || "Get Quote")}
                </button>
              </div>
            </div>
          </div>
        );

      case "pros_cons":
        const pros = parseArrayItems(content.pros as string[] | string);
        const cons = parseArrayItems(content.cons as string[] | string);
        return (
          <div
            key={section.id}
            className="py-16 px-8"
            style={{
              backgroundColor: styleConfig.darkMode ? "#1a1a2e" : styleConfig.backgroundColor,
            }}
          >
            <div className="max-w-4xl mx-auto">
              <h2
                className="text-2xl md:text-3xl font-bold text-center mb-10"
                style={{
                  fontFamily: styleConfig.typography,
                  color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                }}
              >
                {resolvePlaceholder(content.title as string || "Pros & Cons")}
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Pros Column */}
                <div
                  className="rounded-xl p-6"
                  style={{ backgroundColor: styleConfig.darkMode ? "#1a3a1a" : "#f0fdf4" }}
                >
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" /> Pros
                  </h3>
                  <ul className="space-y-3">
                    {pros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-2 text-green-800">
                        <Check className="h-4 w-4 mt-1 shrink-0" />
                        <span>{resolvePlaceholder(pro)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Cons Column */}
                <div
                  className="rounded-xl p-6"
                  style={{ backgroundColor: styleConfig.darkMode ? "#3a1a1a" : "#fef2f2" }}
                >
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" /> Cons
                  </h3>
                  <ul className="space-y-3">
                    {cons.map((con, i) => (
                      <li key={i} className="flex items-start gap-2 text-red-800">
                        <X className="h-4 w-4 mt-1 shrink-0" />
                        <span>{resolvePlaceholder(con)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case "testimonials":
        const testimonialItems = parseArrayItems(content.items as string[] | string);
        return (
          <div
            key={section.id}
            className="py-16 px-8"
            style={{
              backgroundColor: styleConfig.darkMode ? "#16162a" : "#f8f9fa",
            }}
          >
            <div className="max-w-4xl mx-auto">
              <h2
                className="text-2xl md:text-3xl font-bold text-center mb-10"
                style={{
                  fontFamily: styleConfig.typography,
                  color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                }}
              >
                {resolvePlaceholder(content.title as string || "What Our Customers Say")}
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {testimonialItems.map((item, index) => {
                  // Format: "Quote text | Author Name" or just quote
                  const parts = item.split('|').map(s => s.trim());
                  const quote = parts[0] || item;
                  const author = parts[1] || "Happy Customer";
                  return (
                    <div
                      key={index}
                      className="rounded-xl p-6 border"
                      style={{
                        backgroundColor: styleConfig.darkMode ? "#1a1a2e" : "#ffffff",
                        borderColor: styleConfig.darkMode ? "#2a2a4e" : "#e5e5e5",
                      }}
                    >
                      <div className="flex gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 fill-yellow-400 text-yellow-400"
                          />
                        ))}
                      </div>
                      <p
                        className="italic mb-4"
                        style={{
                          fontFamily: styleConfig.typography,
                          color: styleConfig.darkMode ? "#e0e0e0" : "#4a4a4a",
                        }}
                      >
                        "{resolvePlaceholder(quote)}"
                      </p>
                      <p
                        className="font-medium"
                        style={{
                          color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                        }}
                      >
                        — {resolvePlaceholder(author)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "benefits":
        const benefitItems = parseArrayItems(content.items as string[] | string);
        return (
          <div
            key={section.id}
            className="py-16 px-8"
            style={{
              backgroundColor: styleConfig.darkMode ? "#1a1a2e" : styleConfig.backgroundColor,
            }}
          >
            <div className="max-w-4xl mx-auto">
              <h2
                className="text-2xl md:text-3xl font-bold text-center mb-10"
                style={{
                  fontFamily: styleConfig.typography,
                  color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                }}
              >
                {resolvePlaceholder(content.title as string || "Benefits")}
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {benefitItems.map((item, index) => (
                  <div
                    key={index}
                    className="text-center p-6 rounded-xl border"
                    style={{
                      backgroundColor: styleConfig.darkMode ? "#16162a" : "#ffffff",
                      borderColor: styleConfig.darkMode ? "#2a2a4e" : "#e5e5e5",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: `${styleConfig.primaryColor}20` }}
                    >
                      <Check className="h-6 w-6" style={{ color: styleConfig.primaryColor }} />
                    </div>
                    <p
                      className="font-medium"
                      style={{
                        fontFamily: styleConfig.typography,
                        color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                      }}
                    >
                      {resolvePlaceholder(item)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "process":
        const steps = parseArrayItems(content.steps as string[] | string);
        return (
          <div
            key={section.id}
            className="py-16 px-8"
            style={{
              backgroundColor: styleConfig.darkMode ? "#16162a" : "#f8f9fa",
            }}
          >
            <div className="max-w-4xl mx-auto">
              <h2
                className="text-2xl md:text-3xl font-bold text-center mb-10"
                style={{
                  fontFamily: styleConfig.typography,
                  color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                }}
              >
                {resolvePlaceholder(content.title as string || "How It Works")}
              </h2>
              <div className="space-y-6">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-lg"
                    style={{
                      backgroundColor: styleConfig.darkMode ? "#1a1a2e" : "#ffffff",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{ backgroundColor: styleConfig.primaryColor }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p
                        className="font-medium"
                        style={{
                          fontFamily: styleConfig.typography,
                          color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                        }}
                      >
                        {resolvePlaceholder(step)}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <ArrowRight
                        className="h-5 w-5 mt-2 hidden md:block"
                        style={{ color: styleConfig.primaryColor }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "gallery":
        const images = parseArrayItems(content.images as string[] | string);
        return (
          <div
            key={section.id}
            className="py-16 px-8"
            style={{
              backgroundColor: styleConfig.darkMode ? "#1a1a2e" : styleConfig.backgroundColor,
            }}
          >
            <div className="max-w-5xl mx-auto">
              <h2
                className="text-2xl md:text-3xl font-bold text-center mb-10"
                style={{
                  fontFamily: styleConfig.typography,
                  color: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
                }}
              >
                {resolvePlaceholder(content.title as string || "Gallery")}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden border"
                    style={{
                      backgroundColor: styleConfig.darkMode ? "#16162a" : "#f8f9fa",
                      borderColor: styleConfig.darkMode ? "#2a2a4e" : "#e5e5e5",
                    }}
                  >
                    {image.startsWith('http') ? (
                      <img
                        src={image}
                        alt={`Gallery image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4 text-center">
                        <span
                          className="text-sm opacity-60"
                          style={{ color: styleConfig.darkMode ? "#e0e0e0" : "#4a4a4a" }}
                        >
                          {resolvePlaceholder(image)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "image":
        const imageSrc = content.src as string;
        const imageAlt = content.alt as string || "Image";
        return (
          <div
            key={section.id}
            className="py-12 px-8"
            style={{
              backgroundColor: styleConfig.darkMode ? "#1a1a2e" : styleConfig.backgroundColor,
            }}
          >
            <div className="max-w-4xl mx-auto">
              {imageSrc?.startsWith('http') ? (
                <img
                  src={imageSrc}
                  alt={resolvePlaceholder(imageAlt)}
                  className="w-full rounded-xl shadow-lg"
                />
              ) : (
                <div
                  className="aspect-video rounded-xl flex items-center justify-center border"
                  style={{
                    backgroundColor: styleConfig.darkMode ? "#16162a" : "#f8f9fa",
                    borderColor: styleConfig.darkMode ? "#2a2a4e" : "#e5e5e5",
                  }}
                >
                  <span
                    className="text-center px-8 opacity-60"
                    style={{ color: styleConfig.darkMode ? "#e0e0e0" : "#4a4a4a" }}
                  >
                    {resolvePlaceholder(imageSrc || "[Image placeholder]")}
                  </span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div
            key={section.id}
            className="py-12 px-8 text-center opacity-50"
            style={{
              backgroundColor: styleConfig.darkMode ? "#1a1a2e" : "#f0f0f0",
            }}
          >
            <p style={{ fontFamily: styleConfig.typography }}>
              {section.name} ({section.type}) - Preview Unavailable
            </p>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex items-start justify-center">
      <div
        className={cn(
          "bg-background rounded-lg shadow-xl overflow-hidden transition-all duration-300",
          getViewportWidth()
        )}
        style={{
          fontFamily: styleConfig.typography,
        }}
      >
        {/* Preview Header Bar */}
        <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded">
              {sampleData.company || "Your Website"} - Preview
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[600px]">
          {sections.map((section) => renderSection(section))}
        </div>
      </div>
    </div>
  );
}

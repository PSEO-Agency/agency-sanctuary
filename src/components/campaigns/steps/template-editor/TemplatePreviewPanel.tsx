import { TemplateSection } from "@/lib/campaignTemplates";
import { TemplateStyleConfig, TemplateImagesConfig } from "../../types";
import { ViewportSize } from "../TemplateEditorStep";
import { cn } from "@/lib/utils";

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
    let resolved = text;
    
    // Skip if it's a prompt
    if (text.startsWith('prompt("') || text.startsWith("prompt('")) {
      const match = text.match(/prompt\(["'](.*)["']\)/);
      const promptContent = match ? match[1] : "";
      // Show a preview of the prompt content with resolved placeholders
      Object.entries(sampleData).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
        resolved = promptContent.replace(regex, value);
      });
      return `[AI Generated: ${resolved.substring(0, 80)}...]`;
    }
    
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
      resolved = resolved.replace(regex, value);
    });
    return resolved;
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
                {(content.items as string[])?.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 rounded-lg"
                    style={{
                      backgroundColor: styleConfig.darkMode ? "#1a1a2e" : "#ffffff",
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
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
                {resolvePlaceholder(content.title as string)}
              </h2>
              {content.description && (
                <p
                  className="text-lg text-white/90"
                  style={{ fontFamily: styleConfig.typography }}
                >
                  {resolvePlaceholder(content.description as string)}
                </p>
              )}
              {content.button_text && (
                <button
                  className={cn(getButtonClasses(), "bg-white")}
                  style={{
                    color: styleConfig.primaryColor,
                    borderColor: "#ffffff",
                  }}
                >
                  {resolvePlaceholder(content.button_text as string)}
                </button>
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
              {section.name} - Coming Soon
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

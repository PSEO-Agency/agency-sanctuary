import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { TemplateSection } from "@/lib/campaignTemplates";
import { TemplateStyleConfig, TemplateImagesConfig } from "@/components/campaigns/types";
import { SectionContent } from "@/hooks/useCampaignPages";
import { hasPrompts, getPromptPlaceholder, parseStaticPlaceholders } from "@/lib/templateParser";
import { EditableText } from "@/components/campaigns/detail/EditableText";
import { loadGoogleFont } from "@/lib/fontLoader";
import { ViewportSize } from "./types";

interface PreviewCanvasProps {
  sections: TemplateSection[];
  styleConfig: TemplateStyleConfig;
  imagesConfig: TemplateImagesConfig;
  dataValues: Record<string, string>;
  generatedContent?: SectionContent[];
  viewport: ViewportSize;
  isEditable?: boolean;
  onFieldEdit?: (sectionId: string, fieldName: string, value: string) => void;
  selectedSection?: string | null;
  onSectionSelect?: (sectionId: string) => void;
  mode: "template" | "page";
}

export function PreviewCanvas({
  sections,
  styleConfig,
  imagesConfig,
  dataValues,
  generatedContent = [],
  viewport,
  isEditable = false,
  onFieldEdit,
  selectedSection,
  onSectionSelect,
  mode,
}: PreviewCanvasProps) {
  const availableVariables = Object.keys(dataValues);

  // Load font when component mounts or font changes
  useEffect(() => {
    if (styleConfig.typography) {
      loadGoogleFont(styleConfig.typography);
    }
  }, [styleConfig.typography]);

  const getViewportWidth = () => {
    switch (viewport) {
      case "mobile":
        return "max-w-[375px]";
      case "tablet":
        return "max-w-[768px]";
      default:
        return "max-w-[1200px]";
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

  // Template mode: resolve placeholders
  const resolvePlaceholder = (text: string): string => {
    let resolved = text;
    
    if (text.startsWith('prompt("') || text.startsWith("prompt('")) {
      const match = text.match(/prompt\(["'](.*)["']\)/);
      const promptContent = match ? match[1] : "";
      Object.entries(dataValues).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
        resolved = promptContent.replace(regex, value);
      });
      return `[AI Generated: ${resolved.substring(0, 80)}...]`;
    }
    
    Object.entries(dataValues).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
      resolved = resolved.replace(regex, value);
    });
    return resolved;
  };

  // Page mode: get content from generated sections
  const getRawFieldContent = (sectionId: string, fieldName: string): string => {
    const section = generatedContent.find(s => s.id === sectionId);
    if (section?.fields?.[fieldName]) {
      const field = section.fields[fieldName];
      if (field.isPrompt && field.generated) {
        return field.generated;
      }
      return field.original || field.rendered || "";
    }
    
    const templateSection = sections.find(s => s.id === sectionId);
    const templateValue = templateSection?.content[fieldName];
    
    if (typeof templateValue === "string") {
      if (hasPrompts(templateValue)) {
        const promptMatch = templateValue.match(/prompt\(["'`]([^"'`]+)["'`]\)/);
        if (promptMatch) {
          return promptMatch[1];
        }
      }
      return templateValue;
    }
    
    return "";
  };

  const getFieldContent = (sectionId: string, fieldName: string): string => {
    const section = generatedContent.find(s => s.id === sectionId);
    if (section?.fields?.[fieldName]) {
      const field = section.fields[fieldName];
      if (field.isPrompt && field.generated) {
        return parseStaticPlaceholders(field.generated, dataValues);
      }
      return parseStaticPlaceholders(field.rendered || field.original || "", dataValues);
    }
    
    const templateSection = sections.find(s => s.id === sectionId);
    const templateValue = templateSection?.content[fieldName];
    
    if (typeof templateValue === "string") {
      if (hasPrompts(templateValue)) {
        const promptMatch = templateValue.match(/prompt\(["'`]([^"'`]+)["'`]\)/);
        if (promptMatch) {
          const resolvedPrompt = parseStaticPlaceholders(promptMatch[1], dataValues);
          return getPromptPlaceholder(resolvedPrompt);
        }
      }
      return parseStaticPlaceholders(templateValue, dataValues);
    }
    
    return "";
  };

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
    
    const templateSection = sections.find(s => s.id === sectionId);
    const items = templateSection?.content[fieldName];
    if (Array.isArray(items)) {
      return items.map(item => parseStaticPlaceholders(item, dataValues));
    }
    return [];
  };

  const renderField = (sectionId: string, fieldName: string, multiline = false) => {
    if (mode === "page" && isEditable && onFieldEdit) {
      const displayValue = getFieldContent(sectionId, fieldName);
      const rawValue = getRawFieldContent(sectionId, fieldName);
      return (
        <EditableText
          value={rawValue}
          displayValue={displayValue}
          onSave={(val) => onFieldEdit(sectionId, fieldName, val)}
          availableVariables={availableVariables}
          multiline={multiline}
        />
      );
    }
    
    if (mode === "page") {
      return getFieldContent(sectionId, fieldName);
    }
    
    // Template mode
    const templateSection = sections.find(s => s.id === sectionId);
    const templateValue = templateSection?.content[fieldName];
    if (typeof templateValue === "string") {
      return resolvePlaceholder(templateValue);
    }
    return "";
  };

  const getSectionWrapperProps = (sectionId: string) => {
    if (!onSectionSelect) return {};
    
    const isSelected = selectedSection === sectionId;
    
    return {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onSectionSelect(sectionId);
      },
      className: cn(
        "relative cursor-pointer transition-all duration-200 group/section",
        isSelected 
          ? "ring-4 ring-primary ring-offset-2" 
          : "hover:ring-2 hover:ring-primary/50 hover:ring-offset-1"
      ),
    };
  };

  const renderSectionOverlay = (sectionId: string, sectionName: string) => {
    if (!onSectionSelect) return null;
    
    const isSelected = selectedSection === sectionId;
    
    return (
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none transition-all duration-200",
          isSelected ? "bg-primary/5" : ""
        )}
      >
        <div 
          className={cn(
            "absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded",
            isSelected 
              ? "bg-primary text-primary-foreground" 
              : "bg-background/90 text-foreground border opacity-0 group-hover/section:opacity-100 transition-opacity"
          )}
        >
          {sectionName}
        </div>
      </div>
    );
  };

  const colors = {
    bg: styleConfig.darkMode ? "#1a1a2e" : styleConfig.backgroundColor,
    bgAlt: styleConfig.darkMode ? "#16162a" : "#f8f9fa",
    text: styleConfig.darkMode ? "#ffffff" : "#1a1a2e",
    textMuted: styleConfig.darkMode ? "#e0e0e0" : "#4a4a4a",
  };

  return (
    <div className="h-full flex items-start justify-center p-6 bg-muted/30 overflow-auto">
      <div
        className={cn(
          "bg-background rounded-lg shadow-xl overflow-hidden transition-all duration-300 w-full",
          getViewportWidth()
        )}
        style={{ fontFamily: styleConfig.typography }}
      >
        {/* Browser Chrome */}
        <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded">
              {dataValues.company || "Your Website"} - Preview
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[calc(100vh-200px)]">
          {sections.map((section) => {
            const wrapperProps = getSectionWrapperProps(section.id);
            
            switch (section.type) {
              case "hero":
                return (
                  <section
                    key={section.id}
                    {...wrapperProps}
                    className={cn(
                      "relative py-20 px-8",
                      wrapperProps.className
                    )}
                    style={{ backgroundColor: colors.bg }}
                  >
                    {renderSectionOverlay(section.id, section.name)}
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
                        style={{ fontFamily: styleConfig.typography, color: colors.text }}
                      >
                        {renderField(section.id, "headline")}
                      </h1>
                      {section.content.subheadline && (
                        <p
                          className="text-lg opacity-80"
                          style={{ fontFamily: styleConfig.typography, color: colors.textMuted }}
                        >
                          {renderField(section.id, "subheadline")}
                        </p>
                      )}
                      {section.content.cta_text && (
                        <button
                          className={getButtonClasses()}
                          style={{
                            backgroundColor: styleConfig.buttonFill === "solid" ? styleConfig.primaryColor : "transparent",
                            borderColor: styleConfig.primaryColor,
                            color: styleConfig.buttonFill === "solid" ? "#ffffff" : styleConfig.primaryColor,
                          }}
                        >
                          {renderField(section.id, "cta_text")}
                        </button>
                      )}
                    </div>
                  </section>
                );

              case "features":
                const items = mode === "page" 
                  ? getFieldItems(section.id, "items")
                  : (section.content.items as string[] || []).map(item => resolvePlaceholder(item));
                return (
                  <section
                    key={section.id}
                    {...wrapperProps}
                    className={cn("py-16 px-8", wrapperProps.className)}
                    style={{ backgroundColor: colors.bgAlt }}
                  >
                    {renderSectionOverlay(section.id, section.name)}
                    <div className="max-w-4xl mx-auto">
                      <h2
                        className="text-2xl md:text-3xl font-bold text-center mb-10"
                        style={{ fontFamily: styleConfig.typography, color: colors.text }}
                      >
                        {renderField(section.id, "title")}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {items.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-4 rounded-lg"
                            style={{ backgroundColor: styleConfig.darkMode ? "#1a1a2e" : "#ffffff" }}
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                              style={{ backgroundColor: styleConfig.primaryColor }}
                            >
                              ✓
                            </div>
                            <span style={{ fontFamily: styleConfig.typography, color: colors.textMuted }}>
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                );

              case "content":
                return (
                  <section
                    key={section.id}
                    {...wrapperProps}
                    className={cn("py-16 px-8", wrapperProps.className)}
                    style={{ backgroundColor: colors.bg }}
                  >
                    {renderSectionOverlay(section.id, section.name)}
                    <div className="max-w-3xl mx-auto">
                      <h2
                        className="text-2xl md:text-3xl font-bold mb-6"
                        style={{ fontFamily: styleConfig.typography, color: colors.text }}
                      >
                        {renderField(section.id, "title")}
                      </h2>
                      <p
                        className="text-lg leading-relaxed opacity-80"
                        style={{ fontFamily: styleConfig.typography, color: colors.textMuted }}
                      >
                        {renderField(section.id, "body", true)}
                      </p>
                    </div>
                  </section>
                );

              case "cta":
                return (
                  <section
                    key={section.id}
                    {...wrapperProps}
                    className={cn("py-16 px-8 text-center", wrapperProps.className)}
                    style={{ backgroundColor: styleConfig.primaryColor }}
                  >
                    {renderSectionOverlay(section.id, section.name)}
                    <div className="max-w-2xl mx-auto space-y-6">
                      <h2
                        className="text-2xl md:text-3xl font-bold text-white"
                        style={{ fontFamily: styleConfig.typography }}
                      >
                        {renderField(section.id, "title")}
                      </h2>
                      {section.content.description && (
                        <p
                          className="text-lg text-white/90"
                          style={{ fontFamily: styleConfig.typography }}
                        >
                          {renderField(section.id, "description", true)}
                        </p>
                      )}
                      {section.content.button_text && (
                        <button
                          className={cn(getButtonClasses(), "bg-white")}
                          style={{ color: styleConfig.primaryColor, borderColor: "#ffffff" }}
                        >
                          {renderField(section.id, "button_text")}
                        </button>
                      )}
                    </div>
                  </section>
                );

              default:
                return (
                  <section
                    key={section.id}
                    {...wrapperProps}
                    className={cn("py-12 px-8 text-center opacity-50", wrapperProps.className)}
                    style={{ backgroundColor: colors.bgAlt }}
                  >
                    {renderSectionOverlay(section.id, section.name)}
                    <p style={{ fontFamily: styleConfig.typography }}>
                      {section.name} - Coming Soon
                    </p>
                  </section>
                );
            }
          })}

          {/* Footer */}
          <footer 
            className="py-8 px-8 text-white text-center text-sm"
            style={{ backgroundColor: styleConfig.darkMode ? "#0f0f1a" : "#1a1a2e" }}
          >
            <p style={{ fontFamily: styleConfig.typography }}>
              © {new Date().getFullYear()} {parseStaticPlaceholders(dataValues.company || "Your Company", dataValues)}. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

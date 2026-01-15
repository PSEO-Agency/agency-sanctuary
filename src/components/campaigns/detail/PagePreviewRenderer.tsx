import { cn } from "@/lib/utils";
import { TemplateSection } from "@/lib/campaignTemplates";
import { hasPrompts, getPromptPlaceholder, parseStaticPlaceholders } from "@/lib/templateParser";
import { SectionContent } from "@/hooks/useCampaignPages";

interface PagePreviewRendererProps {
  sections: TemplateSection[];
  dataValues: Record<string, string>;
  generatedContent: SectionContent[];
  businessName?: string;
  className?: string;
  isVisualMode?: boolean;
  selectedSection?: string | null;
  onSectionSelect?: (sectionId: string) => void;
}

export function PagePreviewRenderer({
  sections,
  dataValues,
  generatedContent,
  businessName = "Your Company",
  className,
  isVisualMode = false,
  selectedSection = null,
  onSectionSelect,
}: PagePreviewRendererProps) {
  
  // Helper to get field content (generated or fallback to template)
  // ALWAYS resolves {{placeholders}} at render time to handle singular/plural mismatches
  const getFieldContent = (sectionId: string, fieldName: string): string => {
    // First try to get from generated content
    const section = generatedContent.find(s => s.id === sectionId);
    if (section?.fields?.[fieldName]) {
      const field = section.fields[fieldName];
      // If it's a prompt, use generated content
      if (field.isPrompt && field.generated) {
        // AI-generated content should already be clean, but parse just in case
        return parseStaticPlaceholders(field.generated, dataValues);
      }
      // Otherwise use rendered - ALWAYS parse to resolve any remaining placeholders
      return parseStaticPlaceholders(field.rendered || field.original || "", dataValues);
    }
    
    // Fallback to template parsing
    const templateSection = sections.find(s => s.id === sectionId);
    const templateValue = templateSection?.content[fieldName];
    
    if (typeof templateValue === "string") {
      // Check if it's a prompt
      if (hasPrompts(templateValue)) {
        const promptMatch = templateValue.match(/prompt\(["'`]([^"'`]+)["'`]\)/);
        if (promptMatch) {
          const resolvedPrompt = parseStaticPlaceholders(promptMatch[1], dataValues);
          return getPromptPlaceholder(resolvedPrompt);
        }
      }
      // Otherwise just replace placeholders
      return parseStaticPlaceholders(templateValue, dataValues);
    }
    
    return "";
  };

  // Helper to get array field items
  // ALWAYS resolves {{placeholders}} for each item at render time
  const getFieldItems = (sectionId: string, fieldName: string): string[] => {
    // First try to get from generated content
    const section = generatedContent.find(s => s.id === sectionId);
    if (section?.fields?.[fieldName]) {
      const field = section.fields[fieldName];
      try {
        const items = JSON.parse(field.rendered || field.original || "[]");
        if (Array.isArray(items)) {
          // ALWAYS parse each item to resolve remaining placeholders
          return items.map(item => parseStaticPlaceholders(String(item), dataValues));
        }
      } catch {
        // If not JSON, try splitting by newlines or return as single item
        if (field.rendered) {
          return field.rendered.split('\n').filter(Boolean).map(item => 
            parseStaticPlaceholders(item, dataValues)
          );
        }
      }
    }
    
    // Fallback to template
    const templateSection = sections.find(s => s.id === sectionId);
    const items = templateSection?.content[fieldName];
    if (Array.isArray(items)) {
      return items.map(item => parseStaticPlaceholders(item, dataValues));
    }
    return [];
  };

  const resolvedBusinessName = parseStaticPlaceholders(businessName, dataValues) || 
    dataValues.company || dataValues.business || "Your Company";

  const getSectionWrapperProps = (sectionId: string) => {
    if (!isVisualMode) return {};
    
    const isSelected = selectedSection === sectionId;
    return {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onSectionSelect?.(sectionId);
      },
      className: cn(
        "relative cursor-pointer transition-all duration-200",
        isSelected 
          ? "ring-4 ring-purple-500 ring-offset-2 ring-offset-white" 
          : "hover:ring-2 hover:ring-purple-500/50 hover:ring-offset-1 hover:ring-offset-white"
      ),
    };
  };

  const renderSectionOverlay = (sectionId: string, sectionName: string) => {
    if (!isVisualMode) return null;
    const isSelected = selectedSection === sectionId;
    
    return (
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none transition-all duration-200",
          isSelected ? "bg-purple-500/10" : "hover:bg-purple-500/5"
        )}
      >
        <div 
          className={cn(
            "absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded",
            isSelected 
              ? "bg-purple-500 text-white" 
              : "bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          )}
        >
          {sectionName}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("bg-white text-gray-900 min-h-[600px]", className)}>
      {sections.map((section) => {
        const wrapperProps = getSectionWrapperProps(section.id);
        
        switch (section.type) {
          case "hero":
            return (
              <section 
                key={section.id} 
                {...wrapperProps}
                className={cn(
                  "bg-gradient-to-br from-primary to-primary/80 text-white py-16 px-8 group",
                  wrapperProps.className
                )}
              >
                {renderSectionOverlay(section.id, section.name)}
                <div className="max-w-4xl mx-auto text-center relative">
                  <h1 className="text-4xl font-bold mb-4">
                    {getFieldContent(section.id, "headline")}
                  </h1>
                  <p className="text-xl text-white/90 mb-8">
                    {getFieldContent(section.id, "subheadline")}
                  </p>
                  <button className="bg-white text-primary font-semibold px-8 py-3 rounded-lg hover:bg-white/90 transition-colors">
                    {getFieldContent(section.id, "cta_text") || "Get Started"}
                  </button>
                </div>
              </section>
            );

          case "features":
            const featureItems = getFieldItems(section.id, "items");
            return (
              <section 
                key={section.id} 
                {...wrapperProps}
                className={cn(
                  "py-16 px-8 bg-gray-50 group",
                  wrapperProps.className
                )}
              >
                {renderSectionOverlay(section.id, section.name)}
                <div className="max-w-4xl mx-auto relative">
                  <h2 className="text-2xl font-bold text-center mb-8">
                    {getFieldContent(section.id, "title")}
                  </h2>
                  <div className="grid grid-cols-2 gap-6">
                    {featureItems.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm">
                        <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm flex-shrink-0">
                          ✓
                        </div>
                        <span className="text-gray-700">{item}</span>
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
                className={cn(
                  "py-16 px-8 group",
                  wrapperProps.className
                )}
              >
                {renderSectionOverlay(section.id, section.name)}
                <div className="max-w-3xl mx-auto relative">
                  <h2 className="text-2xl font-bold mb-6">
                    {getFieldContent(section.id, "title")}
                  </h2>
                  <div className="prose prose-lg text-gray-600">
                    <p>{getFieldContent(section.id, "body")}</p>
                  </div>
                </div>
              </section>
            );

          case "cta":
            return (
              <section 
                key={section.id} 
                {...wrapperProps}
                className={cn(
                  "py-16 px-8 bg-primary/5 group",
                  wrapperProps.className
                )}
              >
                {renderSectionOverlay(section.id, section.name)}
                <div className="max-w-2xl mx-auto text-center relative">
                  <h2 className="text-2xl font-bold mb-4">
                    {getFieldContent(section.id, "title")}
                  </h2>
                  <p className="text-gray-600 mb-8">
                    {getFieldContent(section.id, "description")}
                  </p>
                  <button className="bg-primary text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors">
                    {getFieldContent(section.id, "button_text") || "Contact Us"}
                  </button>
                </div>
              </section>
            );

          case "faq":
          case "testimonials":
          case "gallery":
          case "footer":
            // Placeholder for other section types
            return (
              <section 
                key={section.id} 
                {...wrapperProps}
                className={cn(
                  "py-12 px-8 border-t group",
                  wrapperProps.className
                )}
              >
                {renderSectionOverlay(section.id, section.name)}
                <div className="max-w-3xl mx-auto text-center text-gray-400 relative">
                  <p className="text-sm">[{section.name} - Coming Soon]</p>
                </div>
              </section>
            );

          default:
            return null;
        }
      })}

      {/* Footer */}
      <footer className="py-8 px-8 bg-gray-900 text-white text-center text-sm">
        <p>© {new Date().getFullYear()} {resolvedBusinessName}. All rights reserved.</p>
      </footer>
    </div>
  );
}

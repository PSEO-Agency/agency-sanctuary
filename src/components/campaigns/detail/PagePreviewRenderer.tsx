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
}

export function PagePreviewRenderer({
  sections,
  dataValues,
  generatedContent,
  businessName = "Your Company",
  className,
}: PagePreviewRendererProps) {
  // Build a map of generated content by section ID
  const contentMap = generatedContent.reduce((acc, section) => {
    acc[section.id] = section.content;
    return acc;
  }, {} as Record<string, string>);

  // Check if we have any generated content
  const hasGeneratedContent = generatedContent.length > 0 && generatedContent.some(s => s.generated);

  const renderContent = (content: string, sectionId: string): string => {
    // If we have generated content for this section, use it
    if (hasGeneratedContent && contentMap[sectionId]) {
      return contentMap[sectionId];
    }

    // First replace static placeholders
    let rendered = parseStaticPlaceholders(content, dataValues);
    
    // If it's a prompt, show placeholder
    if (hasPrompts(content)) {
      const match = content.match(/prompt\(["'`]([^"'`]+)["'`]\)/);
      if (match) {
        const promptText = parseStaticPlaceholders(match[1], dataValues);
        return getPromptPlaceholder(promptText);
      }
    }
    
    return rendered;
  };

  // For non-prompt content, just replace placeholders
  const renderStaticContent = (content: string): string => {
    return parseStaticPlaceholders(content, dataValues);
  };

  return (
    <div className={cn("bg-white text-gray-900 min-h-[600px]", className)}>
      {sections.map((section) => {
        switch (section.type) {
          case "hero":
            return (
              <section key={section.id} className="bg-gradient-to-br from-primary to-primary/80 text-white py-16 px-8">
                <div className="max-w-4xl mx-auto text-center">
                  <h1 className="text-4xl font-bold mb-4">
                    {renderStaticContent(section.content.headline as string)}
                  </h1>
                  <p className="text-xl text-white/90 mb-8">
                    {renderContent(section.content.subheadline as string, section.id)}
                  </p>
                  <button className="bg-white text-primary font-semibold px-8 py-3 rounded-lg hover:bg-white/90 transition-colors">
                    {renderStaticContent(section.content.cta_text as string)}
                  </button>
                </div>
              </section>
            );

          case "features":
            return (
              <section key={section.id} className="py-16 px-8 bg-gray-50">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold text-center mb-8">
                    {renderStaticContent(section.content.title as string)}
                  </h2>
                  <div className="grid grid-cols-2 gap-6">
                    {(section.content.items as string[]).map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm">
                        <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">
                          ✓
                        </div>
                        <span className="text-gray-700">{renderStaticContent(item)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          case "content":
            return (
              <section key={section.id} className="py-16 px-8">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-2xl font-bold mb-6">
                    {renderStaticContent(section.content.title as string)}
                  </h2>
                  <div className="prose prose-lg text-gray-600">
                    <p>{renderContent(section.content.body as string, section.id)}</p>
                  </div>
                </div>
              </section>
            );

          case "cta":
            return (
              <section key={section.id} className="py-16 px-8 bg-primary/5">
                <div className="max-w-2xl mx-auto text-center">
                  <h2 className="text-2xl font-bold mb-4">
                    {renderStaticContent(section.content.title as string)}
                  </h2>
                  <p className="text-gray-600 mb-8">
                    {renderContent(section.content.description as string, section.id)}
                  </p>
                  <button className="bg-primary text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors">
                    {renderStaticContent(section.content.button_text as string)}
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
              <section key={section.id} className="py-12 px-8 border-t">
                <div className="max-w-3xl mx-auto text-center text-gray-400">
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
        <p>© {new Date().getFullYear()} {businessName}. All rights reserved.</p>
      </footer>
    </div>
  );
}

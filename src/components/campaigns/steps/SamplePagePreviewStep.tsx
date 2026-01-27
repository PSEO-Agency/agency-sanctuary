import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CampaignFormData, TitlePattern, Entity } from "../types";
import { TemplatePreviewPanel } from "./template-editor/TemplatePreviewPanel";
import { Loader2, RefreshCw, Check, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TemplateSection } from "@/lib/campaignTemplates";
import { toast } from "sonner";

interface SamplePagePreviewStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
  onBack: () => void;
  onFinish: () => void;
}

interface SamplePage {
  title: string;
  dataValues: Record<string, string>;
  sectionsContent: any[];
  status: "pending" | "generating" | "success" | "error";
  error?: string;
}

export function SamplePagePreviewStep({
  formData,
  updateFormData,
  onBack,
  onFinish,
}: SamplePagePreviewStepProps) {
  const [samplePages, setSamplePages] = useState<SamplePage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPreview, setCurrentPreview] = useState(0);

  // Get the first entity template or default
  const getTemplate = useCallback(() => {
    const firstEntityId = formData.entities[0]?.id;
    if (firstEntityId && formData.entityTemplates[firstEntityId]) {
      return formData.entityTemplates[firstEntityId];
    }
    return formData.templateContent || {
      sections: [],
      style: {
        primaryColor: "#6366f1",
        backgroundColor: "#ffffff",
        typography: "Inter",
        buttonStyle: "rounded" as const,
        buttonFill: "solid" as const,
        darkMode: false,
      },
      images: { sectionImages: [] },
    };
  }, [formData.entities, formData.entityTemplates, formData.templateContent]);

  // Generate 3 random data combinations
  const selectSampleData = useCallback((): Record<string, string>[] => {
    const samples: Record<string, string>[] = [];
    const { scratchData, dynamicColumns } = formData;

    // Get all non-empty column data
    const columns = dynamicColumns.filter(
      (col) => scratchData[col.id]?.length > 0
    );

    if (columns.length === 0) {
      // No data available, create placeholder samples
      return [
        { company: formData.businessName },
        { company: formData.businessName },
        { company: formData.businessName },
      ];
    }

    // Create 3 samples by picking random values from each column
    for (let i = 0; i < 3; i++) {
      const sample: Record<string, string> = {
        company: formData.businessName,
        business: formData.businessName,
      };

      columns.forEach((col) => {
        const values = scratchData[col.id];
        if (values && values.length > 0) {
          // Pick a random value, trying to vary across samples
          const index = Math.min(i, values.length - 1);
          sample[col.variableName.toLowerCase()] = values[index];
        }
      });

      samples.push(sample);
    }

    return samples;
  }, [formData.scratchData, formData.dynamicColumns, formData.businessName]);

  // Build page title from pattern
  const buildPageTitle = useCallback(
    (pattern: TitlePattern | undefined, dataValues: Record<string, string>): string => {
      if (!pattern) return `Sample Page`;
      
      let title = pattern.pattern;
      Object.entries(dataValues).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
        title = title.replace(regex, value);
      });
      return title;
    },
    []
  );

  // Generate sample pages
  const generateSamples = useCallback(async () => {
    setIsGenerating(true);
    const sampleData = selectSampleData();
    const template = getTemplate();
    const firstPattern = formData.titlePatterns[0];

    // Initialize sample pages with pending status
    const initialPages: SamplePage[] = sampleData.map((data) => ({
      title: buildPageTitle(firstPattern, data),
      dataValues: data,
      sectionsContent: [],
      status: "pending" as const,
    }));

    setSamplePages(initialPages);

    // Generate content for each sample page
    const updatedPages = [...initialPages];

    for (let i = 0; i < sampleData.length; i++) {
      try {
        updatedPages[i] = { ...updatedPages[i], status: "generating" };
        setSamplePages([...updatedPages]);

        // Call the content generation edge function
        const { data: result, error } = await supabase.functions.invoke(
          "generate-campaign-content",
          {
            body: {
              // For sample preview, we don't have a real page_id
              // So we'll create a temporary mock
              page_id: `sample-${i}`,
              business_name: formData.businessName,
              business_type: formData.businessType,
              data_values: sampleData[i],
              template_sections: template.sections,
              tone_of_voice: "Professional and friendly",
              is_sample: true, // Flag to indicate this is a sample preview
            },
          }
        );

        if (error) throw error;

        updatedPages[i] = {
          ...updatedPages[i],
          status: "success",
          sectionsContent: result?.sections || [],
        };
        setSamplePages([...updatedPages]);
      } catch (err) {
        console.error(`Failed to generate sample ${i}:`, err);
        updatedPages[i] = {
          ...updatedPages[i],
          status: "error",
          error: err instanceof Error ? err.message : "Generation failed",
        };
        setSamplePages([...updatedPages]);
      }
    }

    setIsGenerating(false);
  }, [
    selectSampleData,
    getTemplate,
    formData.titlePatterns,
    formData.businessName,
    formData.businessType,
    buildPageTitle,
  ]);

  // Generate on mount
  useEffect(() => {
    generateSamples();
  }, []);

  const template = getTemplate();
  const styleConfig = template.style || {
    primaryColor: "#6366f1",
    backgroundColor: "#ffffff",
    typography: "Inter",
    buttonStyle: "rounded" as const,
    buttonFill: "solid" as const,
    darkMode: false,
  };
  const imagesConfig = template.images || { sectionImages: [] };

  const allGenerated = samplePages.every((p) => p.status === "success");
  const hasErrors = samplePages.some((p) => p.status === "error");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h2 className="text-xl font-semibold">Preview Sample Pages</h2>
          <p className="text-sm text-muted-foreground">
            Review 3 generated sample pages before finalizing your campaign
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Editor
          </Button>
          <Button
            variant="outline"
            onClick={generateSamples}
            disabled={isGenerating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
            Regenerate Samples
          </Button>
          <Button
            onClick={onFinish}
            disabled={isGenerating || hasErrors}
          >
            <Check className="h-4 w-4 mr-2" />
            Looks Good - Create Campaign
          </Button>
        </div>
      </div>

      {/* Sample Navigation */}
      <div className="flex items-center justify-center gap-4 py-4 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentPreview === 0}
          onClick={() => setCurrentPreview((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-2">
          {samplePages.map((page, i) => (
            <button
              key={i}
              onClick={() => setCurrentPreview(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPreview === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border hover:bg-muted"
              }`}
            >
              {page.status === "generating" && (
                <Loader2 className="h-3 w-3 animate-spin inline mr-2" />
              )}
              {page.status === "success" && (
                <Check className="h-3 w-3 inline mr-2 text-green-500" />
              )}
              {page.status === "error" && (
                <AlertCircle className="h-3 w-3 inline mr-2 text-red-500" />
              )}
              Sample {i + 1}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={currentPreview === samplePages.length - 1}
          onClick={() => setCurrentPreview((p) => Math.min(samplePages.length - 1, p + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto p-6 bg-muted/20">
        {samplePages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Preparing sample pages...</p>
            </div>
          </div>
        ) : samplePages[currentPreview]?.status === "generating" ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="font-medium mb-1">Generating Content...</p>
              <p className="text-sm text-muted-foreground">
                {samplePages[currentPreview]?.title}
              </p>
            </div>
          </div>
        ) : samplePages[currentPreview]?.status === "error" ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
              <p className="font-medium mb-1">Generation Failed</p>
              <p className="text-sm text-muted-foreground mb-4">
                {samplePages[currentPreview]?.error}
              </p>
              <Button onClick={generateSamples} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            {/* Page Title */}
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold">
                {samplePages[currentPreview]?.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                Data: {Object.entries(samplePages[currentPreview]?.dataValues || {})
                  .filter(([k]) => k !== "company" && k !== "business")
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" • ")}
              </p>
            </div>

            {/* Preview Panel */}
            <TemplatePreviewPanel
              sections={template.sections as TemplateSection[]}
              styleConfig={styleConfig}
              imagesConfig={imagesConfig}
              sampleData={{
                ...samplePages[currentPreview]?.dataValues,
                company: formData.businessName,
              }}
              viewport="desktop"
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-6 py-3 border-t bg-background">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {isGenerating
              ? "Generating sample content..."
              : allGenerated
              ? "All samples generated successfully!"
              : hasErrors
              ? "Some samples failed to generate. Try regenerating."
              : "Ready to preview"}
          </span>
          <span className="text-muted-foreground">
            Preview {currentPreview + 1} of {samplePages.length}
          </span>
        </div>
      </div>
    </div>
  );
}

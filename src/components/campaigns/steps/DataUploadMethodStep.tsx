import { FileSpreadsheet, LayoutGrid, ExternalLink } from "lucide-react";
import { CampaignFormData } from "../types";
import { cn } from "@/lib/utils";

interface DataUploadMethodStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
}

export function DataUploadMethodStep({ formData, updateFormData }: DataUploadMethodStepProps) {
  const options = [
    {
      id: "csv" as const,
      icon: FileSpreadsheet,
      title: "Upload CSV File",
      description: "Import your existing dataset to get started quickly.",
      link: {
        text: "View example Google Sheet",
        url: "#",
      },
    },
    {
      id: "scratch" as const,
      icon: LayoutGrid,
      title: "Build From Scratch",
      description: "Create your dataset manually using our guided list builder.",
      link: null,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose How to Add Your Data</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Upload your data from a CSV file or build it from scratch. We'll use this information to generate your campaign pages.
          This is extremely important to make them as accurate as possible!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => updateFormData({ dataUploadMethod: option.id })}
            className={cn(
              "flex flex-col items-center text-center p-8 rounded-xl border-2 transition-all",
              formData.dataUploadMethod === option.id
                ? "border-primary bg-primary/5 shadow-lg"
                : "border-border hover:border-primary/50"
            )}
          >
            <div
              className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center mb-4",
                formData.dataUploadMethod === option.id
                  ? "bg-primary/20"
                  : "bg-muted"
              )}
            >
              <option.icon className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{option.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
            {option.link && (
              <a
                href={option.link.url}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {option.link.text}
              </a>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

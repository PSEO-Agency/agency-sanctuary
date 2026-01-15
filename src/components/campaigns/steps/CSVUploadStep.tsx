import { useState } from "react";
import { Upload, FileSpreadsheet, ExternalLink, AlertTriangle, CheckCircle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampaignFormData, REQUIRED_FIELDS } from "../types";
import { cn } from "@/lib/utils";

interface CSVUploadStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
}

export function CSVUploadStep({ formData, updateFormData }: CSVUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (file: File) => {
    // Parse CSV headers
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const firstLine = text.split("\n")[0];
      const columns = firstLine.split(",").map((col) => col.trim().replace(/"/g, ""));
      
      updateFormData({
        csvFile: file,
        csvFileName: file.name,
        csvFileSize: (file.size / (1024 * 1024)).toFixed(1) + " MB",
        csvUploadDate: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        csvColumns: columns,
      });
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "text/csv") {
      handleFileUpload(file);
    }
  };

  const handleAutoMap = () => {
    const mappings: Record<string, string> = {};
    REQUIRED_FIELDS.forEach((field) => {
      const match = formData.csvColumns.find(
        (col) =>
          col.toLowerCase().includes(field.id.toLowerCase()) ||
          col.toLowerCase().includes(field.name.toLowerCase().split(" ")[0])
      );
      if (match) {
        mappings[field.id] = match;
      }
    });
    updateFormData({ columnMappings: mappings });
  };

  // Show upload interface if no file
  if (!formData.csvFile) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Upload Your Data File</h2>
          <p className="text-muted-foreground">
            We'll map your file to the correct fields for your campaign.
          </p>
        </div>

        {/* Format Warning */}
        <div className="flex items-start justify-between p-4 border rounded-lg max-w-2xl mx-auto">
          <div>
            <p className="font-semibold">Make sure that your file matches our format</p>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
            >
              <FileSpreadsheet className="h-4 w-4" />
              View Example Google Sheet
            </a>
          </div>
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        {/* Drop Zone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center p-12 rounded-xl border-2 border-dashed cursor-pointer transition-all max-w-2xl mx-auto",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-semibold mb-1">Drag & drop your CSV here</p>
          <p className="text-sm text-muted-foreground">or click to browse your computer</p>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </label>
      </div>
    );
  }

  // Show column mapping interface
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Map Your Data Columns</h2>
        <p className="text-muted-foreground">
          Match your CSV file's columns to the fields we need for your campaign.
        </p>
      </div>

      {/* File Info */}
      <div className="flex items-center justify-between p-4 border rounded-lg max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formData.csvFileName}</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <span className="text-sm text-muted-foreground">
              {formData.csvFileSize} · Uploaded {formData.csvUploadDate}
            </span>
          </div>
        </div>
        <Button
          variant="link"
          className="text-primary"
          onClick={() =>
            updateFormData({
              csvFile: null,
              csvFileName: "",
              csvColumns: [],
              columnMappings: {},
            })
          }
        >
          Replace file
        </Button>
      </div>

      {/* Column Mapping Table */}
      <div className="border rounded-lg max-w-2xl mx-auto overflow-hidden">
        <div className="grid grid-cols-[1fr,1fr,auto] gap-4 p-4 bg-muted/50 font-semibold text-sm">
          <span>Required Field</span>
          <span>Your CSV Column</span>
          <span className="w-8"></span>
        </div>
        {REQUIRED_FIELDS.map((field) => {
          const isMapped = !!formData.columnMappings[field.id];
          return (
            <div
              key={field.id}
              className="grid grid-cols-[1fr,1fr,auto] gap-4 p-4 border-t items-center"
            >
              <span className="font-medium">
                {field.name}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </span>
              <Select
                value={formData.columnMappings[field.id] || ""}
                onValueChange={(value) =>
                  updateFormData({
                    columnMappings: { ...formData.columnMappings, [field.id]: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {formData.csvColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-8 flex justify-center">
                {isMapped ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-Map Button */}
      <div className="flex justify-end max-w-2xl mx-auto">
        <Button onClick={handleAutoMap} className="bg-primary">
          <Wand2 className="h-4 w-4 mr-2" />
          Auto-Map Columns
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { TEMPLATES } from "../../types";
import { cn } from "@/lib/utils";

interface ReusableBlocksTabProps {
  campaign: CampaignDB;
}

export function ReusableBlocksTab({ campaign }: ReusableBlocksTabProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(campaign.template_id || "modern-local");
  const currentTemplate = TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Reusable Blocks</h2>
          <p className="text-sm text-muted-foreground">Choose and set your templates</p>
        </div>
        <Button variant="link" className="text-primary">
          View Library
        </Button>
      </div>

      {/* Selected Template Display */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-sm font-medium">Selected Template</Label>
          <div className="mt-2 flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
            <div className="h-10 w-16 bg-muted rounded flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground">Preview</span>
            </div>
            <span className="font-medium">{currentTemplate?.name || "Modern Local"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Template Grid */}
      <div className="grid grid-cols-3 gap-4">
        {TEMPLATES.map((template) => {
          const isSelected = selectedTemplate === template.id;
          return (
            <Card 
              key={template.id}
              className={cn(
                "cursor-pointer transition-all overflow-hidden",
                isSelected 
                  ? "ring-2 ring-primary" 
                  : "hover:border-muted-foreground/30"
              )}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <CardContent className="p-0">
                {/* Template Preview */}
                <div className="h-32 bg-gradient-to-br from-muted/80 to-muted flex items-center justify-center relative">
                  <span className="text-sm text-muted-foreground">{template.preview}</span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Template Info */}
                <div className="p-4">
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                  <Button 
                    variant={isSelected ? "secondary" : "default"}
                    size="sm" 
                    className="w-full mt-3"
                    disabled={isSelected}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

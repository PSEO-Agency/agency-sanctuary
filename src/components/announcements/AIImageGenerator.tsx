import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AudienceLevel } from "@/hooks/useAnnouncements";

interface AIImageGeneratorProps {
  onImageGenerated: (url: string) => void;
  selectedAudience: AudienceLevel[];
}

const THEME_OPTIONS: { value: AudienceLevel; label: string; colors: string; className: string }[] = [
  { 
    value: "subaccount", 
    label: "Purple (Subaccounts)", 
    colors: "purple and violet",
    className: "bg-gradient-to-r from-purple-500 to-violet-500"
  },
  { 
    value: "agency", 
    label: "Blue (Agencies)", 
    colors: "blue and indigo",
    className: "bg-gradient-to-r from-blue-500 to-indigo-500"
  },
  { 
    value: "country_partner", 
    label: "Orange (Partners)", 
    colors: "orange and amber",
    className: "bg-gradient-to-r from-orange-500 to-amber-500"
  },
];

export function AIImageGenerator({ onImageGenerated, selectedAudience }: AIImageGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [theme, setTheme] = useState<AudienceLevel>(
    selectedAudience[0] || "subaccount"
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-announcement-image", {
        body: { prompt, theme },
      });

      if (error) throw error;

      if (data?.image_url) {
        onImageGenerated(data.image_url);
        toast.success("Image generated successfully");
      } else {
        throw new Error("No image returned");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <Label className="font-medium">AI Image Generator</Label>
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Describe the image</Label>
        <Input
          placeholder="e.g., A celebration banner for new feature launch"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Theme Colors</Label>
        <RadioGroup 
          value={theme} 
          onValueChange={(v) => setTheme(v as AudienceLevel)}
          className="grid grid-cols-3 gap-2"
        >
          {THEME_OPTIONS.map(option => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                theme === option.value 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:bg-muted/50"
              )}
            >
              <RadioGroupItem value={option.value} className="sr-only" />
              <div className={cn("w-4 h-4 rounded", option.className)} />
              <span className="text-xs">{option.label.split(" ")[0]}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <Button 
        onClick={handleGenerate} 
        disabled={isGenerating || !prompt.trim()}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Image
          </>
        )}
      </Button>
    </div>
  );
}

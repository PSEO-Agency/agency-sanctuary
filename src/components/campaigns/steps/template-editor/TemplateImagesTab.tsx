import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateImagesConfig } from "../../types";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateImagesTabProps {
  imagesConfig: TemplateImagesConfig;
  onUpdateImages: (config: TemplateImagesConfig) => void;
}

const POSITION_OPTIONS = [
  { name: "Center", value: "center" },
  { name: "Top", value: "top" },
  { name: "Bottom", value: "bottom" },
  { name: "Left", value: "left" },
  { name: "Right", value: "right" },
];

export function TemplateImagesTab({ imagesConfig, onUpdateImages }: TemplateImagesTabProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "hero" | "favicon"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      
      if (type === "logo") {
        onUpdateImages({
          ...imagesConfig,
          logo: { url, size: imagesConfig.logo?.size || 50 },
        });
      } else if (type === "hero") {
        onUpdateImages({
          ...imagesConfig,
          heroImage: { url, position: imagesConfig.heroImage?.position || "center" },
        });
      } else if (type === "favicon") {
        onUpdateImages({
          ...imagesConfig,
          favicon: url,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (type: "logo" | "hero" | "favicon") => {
    const updates = { ...imagesConfig };
    if (type === "logo") updates.logo = undefined;
    if (type === "hero") updates.heroImage = undefined;
    if (type === "favicon") updates.favicon = undefined;
    onUpdateImages(updates);
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Logo</Label>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e, "logo")}
        />
        
        {imagesConfig.logo?.url ? (
          <div className="space-y-3">
            <div className="relative aspect-[3/1] bg-muted rounded-lg overflow-hidden border">
              <img
                src={imagesConfig.logo.url}
                alt="Logo preview"
                className="w-full h-full object-contain p-4"
                style={{ transform: `scale(${imagesConfig.logo.size / 50})` }}
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => removeImage("logo")}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Size: {imagesConfig.logo.size}%</Label>
              <Slider
                value={[imagesConfig.logo.size]}
                onValueChange={([value]) =>
                  onUpdateImages({
                    ...imagesConfig,
                    logo: { ...imagesConfig.logo!, size: value },
                  })
                }
                min={20}
                max={100}
                step={5}
              />
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-20 border-dashed flex-col gap-2"
            onClick={() => logoInputRef.current?.click()}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload Logo</span>
          </Button>
        )}
      </div>

      {/* Hero Image Upload */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Hero Image</Label>
        <input
          ref={heroInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e, "hero")}
        />
        
        {imagesConfig.heroImage?.url ? (
          <div className="space-y-3">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
              <img
                src={imagesConfig.heroImage.url}
                alt="Hero preview"
                className={cn(
                  "w-full h-full",
                  imagesConfig.heroImage.position === "center" && "object-cover object-center",
                  imagesConfig.heroImage.position === "top" && "object-cover object-top",
                  imagesConfig.heroImage.position === "bottom" && "object-cover object-bottom",
                  imagesConfig.heroImage.position === "left" && "object-cover object-left",
                  imagesConfig.heroImage.position === "right" && "object-cover object-right"
                )}
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => removeImage("hero")}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Position</Label>
              <Select
                value={imagesConfig.heroImage.position}
                onValueChange={(value) =>
                  onUpdateImages({
                    ...imagesConfig,
                    heroImage: { ...imagesConfig.heroImage!, position: value },
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-24 border-dashed flex-col gap-2"
            onClick={() => heroInputRef.current?.click()}
          >
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload Hero Image</span>
          </Button>
        )}
      </div>

      {/* Favicon Upload */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Favicon</Label>
        <input
          ref={faviconInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e, "favicon")}
        />
        
        {imagesConfig.favicon ? (
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 bg-muted rounded-lg overflow-hidden border flex items-center justify-center">
              <img
                src={imagesConfig.favicon}
                alt="Favicon preview"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm">Favicon uploaded</p>
              <p className="text-xs text-muted-foreground">Recommended: 32x32 or 64x64 pixels</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => removeImage("favicon")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-14 border-dashed flex gap-2"
            onClick={() => faviconInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload Favicon (32x32 recommended)</span>
          </Button>
        )}
      </div>

      {/* Section Images - Placeholder for future */}
      <div className="space-y-3 opacity-60">
        <Label className="text-sm font-medium">Section Images</Label>
        <div className="p-4 border border-dashed rounded-lg text-center">
          <p className="text-xs text-muted-foreground">
            Section-specific images can be added after template creation
          </p>
        </div>
      </div>
    </div>
  );
}

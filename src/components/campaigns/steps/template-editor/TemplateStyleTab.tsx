import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateStyleConfig } from "../../types";
import { cn } from "@/lib/utils";

interface TemplateStyleTabProps {
  styleConfig: TemplateStyleConfig;
  onUpdateStyle: (config: TemplateStyleConfig) => void;
}

const COLOR_PRESETS = [
  { name: "Purple", value: "#8B5CF6" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Pink", value: "#EC4899" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Indigo", value: "#6366F1" },
];

const TYPOGRAPHY_OPTIONS = [
  { name: "Inter", value: "Inter" },
  { name: "Poppins", value: "Poppins" },
  { name: "Roboto", value: "Roboto" },
  { name: "Open Sans", value: "Open Sans" },
  { name: "Lato", value: "Lato" },
  { name: "Montserrat", value: "Montserrat" },
  { name: "Playfair Display", value: "Playfair Display" },
  { name: "Source Sans Pro", value: "Source Sans Pro" },
];

export function TemplateStyleTab({ styleConfig, onUpdateStyle }: TemplateStyleTabProps) {
  const updateField = <K extends keyof TemplateStyleConfig>(
    field: K,
    value: TemplateStyleConfig[K]
  ) => {
    onUpdateStyle({ ...styleConfig, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Color Theme */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Color Theme</Label>
        <div className="grid grid-cols-4 gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color.value}
              onClick={() => updateField("primaryColor", color.value)}
              className={cn(
                "h-10 rounded-lg border-2 transition-all",
                styleConfig.primaryColor === color.value
                  ? "border-foreground scale-105"
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Label className="text-xs text-muted-foreground w-16">Custom:</Label>
          <div className="flex-1 flex items-center gap-2">
            <div
              className="w-8 h-8 rounded border"
              style={{ backgroundColor: styleConfig.primaryColor }}
            />
            <Input
              type="text"
              value={styleConfig.primaryColor}
              onChange={(e) => updateField("primaryColor", e.target.value)}
              className="h-8 font-mono text-xs"
              placeholder="#8B5CF6"
            />
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Typography</Label>
        <Select
          value={styleConfig.typography}
          onValueChange={(value) => updateField("typography", value)}
        >
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPOGRAPHY_OPTIONS.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Button Style */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Buttons</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={styleConfig.buttonStyle === "rounded" ? "default" : "outline"}
            size="sm"
            onClick={() => updateField("buttonStyle", "rounded")}
            className="rounded-full"
          >
            Rounded
          </Button>
          <Button
            variant={styleConfig.buttonStyle === "square" ? "default" : "outline"}
            size="sm"
            onClick={() => updateField("buttonStyle", "square")}
            className="rounded-md"
          >
            Square
          </Button>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Fill Style</Label>
          <Select
            value={styleConfig.buttonFill}
            onValueChange={(value: "solid" | "outline" | "ghost") => updateField("buttonFill", value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid Fill</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="ghost">Ghost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Background */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Background</Label>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded border"
            style={{ backgroundColor: styleConfig.backgroundColor }}
          />
          <Input
            type="text"
            value={styleConfig.backgroundColor}
            onChange={(e) => updateField("backgroundColor", e.target.value)}
            className="h-8 font-mono text-xs flex-1"
            placeholder="#FFFFFF"
          />
          <input
            type="color"
            value={styleConfig.backgroundColor}
            onChange={(e) => updateField("backgroundColor", e.target.value)}
            className="w-8 h-8 rounded border cursor-pointer"
          />
        </div>
      </div>

      {/* Dark Mode */}
      <div className="flex items-center justify-between py-2">
        <div>
          <Label className="text-sm font-medium">Dark Mode</Label>
          <p className="text-xs text-muted-foreground">Enable dark color scheme</p>
        </div>
        <Switch
          checked={styleConfig.darkMode}
          onCheckedChange={(checked) => updateField("darkMode", checked)}
        />
      </div>

      {/* Reset Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-4"
        onClick={() => {
          onUpdateStyle({
            primaryColor: "#8B5CF6",
            backgroundColor: "#FFFFFF",
            typography: "Inter",
            buttonStyle: "rounded",
            buttonFill: "solid",
            darkMode: false,
          });
        }}
      >
        Reset to Default
      </Button>
    </div>
  );
}

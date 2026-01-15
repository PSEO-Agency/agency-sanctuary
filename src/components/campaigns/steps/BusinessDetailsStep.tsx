import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload } from "lucide-react";
import { CampaignFormData, BUSINESS_TYPES } from "../types";
import { cn } from "@/lib/utils";

interface BusinessDetailsStepProps {
  formData: CampaignFormData;
  updateFormData: (updates: Partial<CampaignFormData>) => void;
}

export function BusinessDetailsStep({ formData, updateFormData }: BusinessDetailsStepProps) {
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateFormData({
          businessLogo: file,
          businessLogoPreview: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Tell us about your business</h2>
        <p className="text-muted-foreground">
          We'll use this information to tailor your campaign and generate relevant templates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              placeholder="Enter the text..."
              value={formData.businessName}
              onChange={(e) => updateFormData({ businessName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              placeholder="https://yourwebsite.com"
              value={formData.websiteUrl}
              onChange={(e) => updateFormData({ websiteUrl: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessAddress">Business Address</Label>
            <Textarea
              id="businessAddress"
              placeholder="Enter the text..."
              value={formData.businessAddress}
              onChange={(e) => updateFormData({ businessAddress: e.target.value })}
              className="min-h-[100px]"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Business Logo</Label>
            <label
              htmlFor="logoUpload"
              className={cn(
                "flex flex-col items-center justify-center",
                "border-2 border-dashed rounded-lg p-8 cursor-pointer",
                "hover:border-primary/50 transition-colors",
                formData.businessLogoPreview ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              )}
            >
              {formData.businessLogoPreview ? (
                <img
                  src={formData.businessLogoPreview}
                  alt="Business logo"
                  className="max-h-20 object-contain"
                />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">Click to upload or drag and drop</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, or SVG – max 20MB
                  </span>
                </>
              )}
              <input
                id="logoUpload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </label>
          </div>

          <div className="space-y-2">
            <Label>Business Type / Niche</Label>
            <RadioGroup
              value={formData.businessType}
              onValueChange={(value) => updateFormData({ businessType: value })}
              className="space-y-3"
            >
              {BUSINESS_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    formData.businessType === type.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value={type.id} id={type.id} />
                  <span className="font-medium">{type.name}</span>
                </label>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground mt-2">
              Your choice here determines which templates and data structure you'll see in the next step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

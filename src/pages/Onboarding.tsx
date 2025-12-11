import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Building2, Globe, Phone, Users, MapPin, ArrowRight, ArrowLeft, Check, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingData {
  industry: string;
  website: string;
  phone: string;
  companySize: string;
  address: string;
  city: string;
  country: string;
}

const industries = [
  "Technology",
  "Marketing & Advertising",
  "E-commerce",
  "Healthcare",
  "Finance",
  "Education",
  "Real Estate",
  "Manufacturing",
  "Consulting",
  "Media & Entertainment",
  "Other",
];

const companySizes = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "500+ employees",
];

const steps = [
  { id: 1, title: "Industry", icon: Building2 },
  { id: 2, title: "Company", icon: Globe },
  { id: 3, title: "Location", icon: MapPin },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    industry: "",
    website: "",
    phone: "",
    companySize: "",
    address: "",
    city: "",
    country: "",
  });

  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const updateData = (key: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.industry !== "";
      case 2:
        return data.companySize !== "";
      case 3:
        return true; // Location is optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) {
      toast.error("You must be logged in to complete onboarding");
      return;
    }

    setLoading(true);
    try {
      let agencyId = profile?.agency_id;

      // If user doesn't have an agency (e.g., Google OAuth signup), create one
      if (!agencyId) {
        const companyName = user.user_metadata?.full_name 
          ? `${user.user_metadata.full_name}'s Agency` 
          : "My Agency";
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const { data: agencyData, error: agencyError } = await supabase
          .from("agencies")
          .insert({
            name: companyName,
            slug: `${slug}-${Date.now()}`,
            owner_user_id: user.id,
            settings: {
              industry: data.industry,
              website: data.website,
              phone: data.phone,
              company_size: data.companySize,
              address: data.address,
              city: data.city,
              country: data.country,
            },
          })
          .select()
          .single();

        if (agencyError) throw agencyError;
        agencyId = agencyData.id;

        // Update profile with agency_id and role
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            agency_id: agencyId,
            role: 'agency_admin',
            onboarding_completed: true
          } as any)
          .eq("id", user.id);

        if (profileError) throw profileError;
      } else {
        // Update existing agency with business settings
        await supabase
          .from("agencies")
          .update({
            settings: {
              industry: data.industry,
              website: data.website,
              phone: data.phone,
              company_size: data.companySize,
              address: data.address,
              city: data.city,
              country: data.country,
            },
          })
          .eq("id", agencyId);

        // Mark onboarding as complete
        await supabase
          .from("profiles")
          .update({ onboarding_completed: true } as any)
          .eq("id", user.id);
      }

      await refreshProfile();
      toast.success("Welcome to PSEO Builder!");
      navigate(`/agency/${agencyId}`);
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="industry">What industry are you in?</Label>
              <Select value={data.industry} onValueChange={(v) => updateData("industry", v)}>
                <SelectTrigger id="industry" className="h-12">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companySize">Company size</Label>
              <Select value={data.companySize} onValueChange={(v) => updateData("companySize", v)}>
                <SelectTrigger id="companySize" className="h-12">
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  {companySizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (optional)</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourcompany.com"
                  value={data.website}
                  onChange={(e) => updateData("website", e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number (optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={data.phone}
                  onChange={(e) => updateData("phone", e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="address">Street address (optional)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  type="text"
                  placeholder="123 Main Street"
                  value={data.address}
                  onChange={(e) => updateData("address", e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City (optional)</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="New York"
                  value={data.city}
                  onChange={(e) => updateData("city", e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country (optional)</Label>
                <Input
                  id="country"
                  type="text"
                  placeholder="United States"
                  value={data.country}
                  onChange={(e) => updateData("country", e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/30 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <Card className="w-full max-w-lg relative z-10 shadow-xl border-border/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="w-10" /> {/* Spacer */}
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-primary-foreground font-bold text-xl">P</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                    currentStep > step.id
                      ? "bg-primary border-primary"
                      : currentStep === step.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <step.icon
                      className={cn(
                        "h-5 w-5",
                        currentStep === step.id ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-12 h-0.5 mx-1 transition-all duration-300",
                      currentStep > step.id ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <CardTitle className="text-2xl text-center">
            {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription className="text-center">
            Step {currentStep} of {steps.length}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {renderStep()}

          <div className="flex gap-3 pt-4">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleComplete}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finishing...
                  </>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>

          {currentStep === 3 && (
            <p className="text-center text-sm text-muted-foreground">
              You can update these details later in settings
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
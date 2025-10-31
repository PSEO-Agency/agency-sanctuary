import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface BusinessInfo {
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  timezone?: string;
}

export default function BusinessSettings() {
  const { subaccountId } = useParams();
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubaccount();
  }, [subaccountId]);

  const fetchSubaccount = async () => {
    const { data } = await supabase
      .from('subaccounts')
      .select('*')
      .eq('id', subaccountId)
      .maybeSingle();
    
    if (data) {
      setName(data.name);
      setLocationId(data.location_id);
      const settings = data.business_settings as Record<string, any> || {};
      setBusinessInfo({
        description: settings.description || "",
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
        streetAddress: settings.streetAddress || "",
        city: settings.city || "",
        state: settings.state || "",
        zipCode: settings.zipCode || "",
        country: settings.country || "",
        timezone: settings.timezone || ""
      });
    }
  };

  const handleCopyLocationId = () => {
    navigator.clipboard.writeText(locationId);
    toast.success("Location ID copied to clipboard");
  };

  const updateBusinessInfo = (field: keyof BusinessInfo, value: string) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('subaccounts')
      .update({ 
        name,
        business_settings: businessInfo as Record<string, any>
      })
      .eq('id', subaccountId);

    if (error) {
      toast.error("Failed to update settings");
    } else {
      toast.success("Settings updated successfully");
      fetchSubaccount();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Business Settings</h2>
          <p className="text-muted-foreground">
            Manage your business information
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
          <div className="text-sm">
            <span className="text-muted-foreground">Location ID:</span>
            <span className="ml-2 font-mono font-medium">{locationId}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyLocationId}
            className="h-8 w-8"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Basic business details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter business name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              value={businessInfo.description || ""}
              onChange={(e) => updateBusinessInfo("description", e.target.value)}
              placeholder="Describe your business"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            How customers can reach you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={businessInfo.phone || ""}
                onChange={(e) => updateBusinessInfo("phone", e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={businessInfo.email || ""}
                onChange={(e) => updateBusinessInfo("email", e.target.value)}
                placeholder="contact@business.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={businessInfo.website || ""}
              onChange={(e) => updateBusinessInfo("website", e.target.value)}
              placeholder="https://www.yourbusiness.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Address</CardTitle>
          <CardDescription>
            Physical location details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="streetAddress">Street Address</Label>
            <Input
              id="streetAddress"
              value={businessInfo.streetAddress || ""}
              onChange={(e) => updateBusinessInfo("streetAddress", e.target.value)}
              placeholder="123 Main Street"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={businessInfo.city || ""}
                onChange={(e) => updateBusinessInfo("city", e.target.value)}
                placeholder="San Francisco"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              <Input
                id="state"
                value={businessInfo.state || ""}
                onChange={(e) => updateBusinessInfo("state", e.target.value)}
                placeholder="CA"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP / Postal Code</Label>
              <Input
                id="zipCode"
                value={businessInfo.zipCode || ""}
                onChange={(e) => updateBusinessInfo("zipCode", e.target.value)}
                placeholder="94102"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={businessInfo.country || ""}
                onChange={(e) => updateBusinessInfo("country", e.target.value)}
                placeholder="United States"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Settings</CardTitle>
          <CardDescription>
            Other business preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={businessInfo.timezone || ""}
              onChange={(e) => updateBusinessInfo("timezone", e.target.value)}
              placeholder="America/Los_Angeles"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} size="lg">
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

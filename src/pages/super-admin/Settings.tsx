import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function SuperAdminSettings() {
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPseoBuilder, setShowPseoBuilder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["stripe_publishable_key", "stripe_secret_key", "show_pseo_builder"]);

      if (error) throw error;

      data?.forEach((setting) => {
        if (setting.key === "stripe_publishable_key") {
          setStripePublishableKey(setting.value || "");
        } else if (setting.key === "stripe_secret_key") {
          setStripeSecretKey(setting.value || "");
        } else if (setting.key === "show_pseo_builder") {
          setShowPseoBuilder(setting.value === "true");
        }
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settings = [
        { key: "stripe_publishable_key", value: stripePublishableKey },
        { key: "stripe_secret_key", value: stripeSecretKey },
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from("platform_settings")
          .upsert(setting, { onConflict: "key" });

        if (error) throw error;
      }

      toast.success("Stripe credentials saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveFeatureSettings = async (key: string, value: boolean) => {
    setSavingFeatures(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ key, value: String(value) }, { onConflict: "key" });

      if (error) throw error;
      toast.success("Feature setting saved");
    } catch (error) {
      console.error("Error saving feature setting:", error);
      toast.error("Failed to save setting");
    } finally {
      setSavingFeatures(false);
    }
  };

  const handlePseoToggle = (checked: boolean) => {
    setShowPseoBuilder(checked);
    saveFeatureSettings("show_pseo_builder", checked);
  };

  const testConnection = async () => {
    if (!stripePublishableKey || !stripeSecretKey) {
      toast.error("Please enter both Stripe keys first");
      return;
    }
    toast.info("Stripe connection test will be implemented with Edge Function");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage platform-wide configuration</p>
      </div>

      <Tabs defaultValue="billing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Configuration</CardTitle>
              <CardDescription>
                Configure Stripe API credentials to enable billing for agencies and subaccounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="publishable-key">Publishable Key</Label>
                <Input
                  id="publishable-key"
                  placeholder="pk_live_..."
                  value={stripePublishableKey}
                  onChange={(e) => setStripePublishableKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your Stripe publishable key (starts with pk_)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret-key">Secret Key</Label>
                <div className="relative">
                  <Input
                    id="secret-key"
                    type={showSecretKey ? "text" : "password"}
                    placeholder="sk_live_..."
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                  >
                    {showSecretKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your Stripe secret key (starts with sk_) - keep this secure
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={saveSettings} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Credentials
                </Button>
                <Button variant="outline" onClick={testConnection}>
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Enable or disable features for all subaccounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show pSEO Builder Section</Label>
                  <p className="text-xs text-muted-foreground">
                    Display the pSEO Builder section in subaccount sidebars
                  </p>
                </div>
                <Switch
                  checked={showPseoBuilder}
                  onCheckedChange={handlePseoToggle}
                  disabled={savingFeatures}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>
                General platform configuration options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Additional platform settings will be available here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

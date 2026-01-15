import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plug, Globe, Link2, Rocket, Check } from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";

interface DeploymentSettingsTabProps {
  campaign: CampaignDB;
}

export function DeploymentSettingsTab({ campaign }: DeploymentSettingsTabProps) {
  const [integrationSource, setIntegrationSource] = useState("semrush");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [urlPattern, setUrlPattern] = useState("");
  const [publishingOption, setPublishingOption] = useState("auto");
  const [isConnected, setIsConnected] = useState(true);

  const previewUrl = `https://example.com/${urlPattern || "teeth-whitening/amsterdam/en/"}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Deployment Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your publishing and deployment options</p>
      </div>

      {/* Connect CMS / Hosting */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Connect CMS / Hosting</h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm">Integration Source</Label>
              <Select value={integrationSource} onValueChange={setIntegrationSource}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semrush">Semrush</SelectItem>
                  <SelectItem value="wordpress">WordPress</SelectItem>
                  <SelectItem value="webflow">Webflow</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Authorization</Label>
              <Button 
                variant={isConnected ? "outline" : "default"}
                className={`mt-1 w-full ${isConnected ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" : ""}`}
                onClick={() => setIsConnected(!isConnected)}
              >
                {isConnected && <Check className="h-4 w-4 mr-2" />}
                {isConnected ? "Connected" : "Connect"}
              </Button>
            </div>
            <div>
              <Label className="text-sm">Status</Label>
              <div className="mt-1 p-2.5 bg-primary/5 border border-primary/20 rounded-md text-sm text-primary">
                OAuth required for publishing access
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assign Domain / Subdomain */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Assign Domain / Subdomain</h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm">Domain</Label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose verified domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="example.com">example.com</SelectItem>
                  <SelectItem value="mysite.com">mysite.com</SelectItem>
                  <SelectItem value="custom.com">custom.com</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Subdomain</Label>
              <Input 
                placeholder="e.g. blog.yourdomain.com"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">DNS Status</Label>
              <div className="mt-1 p-2.5 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-green-700 font-medium">Verified</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Set URL Structure */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Set URL Structure</h3>
          </div>

          <div>
            <Label className="text-sm">URL Pattern</Label>
            <Input 
              placeholder="Enter the text..."
              value={urlPattern}
              onChange={(e) => setUrlPattern(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Preview</Label>
            <div className="mt-1 p-3 bg-muted/50 rounded-md">
              <code className="text-sm">{previewUrl}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Publishing Options */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Publishing Options</h3>
          </div>

          <RadioGroup value={publishingOption} onValueChange={setPublishingOption}>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="cursor-pointer">Manual</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto" className="cursor-pointer">Auto-publish</Label>
              </div>
            </div>
          </RadioGroup>

          {publishingOption === "auto" && (
            <p className="text-sm text-muted-foreground">
              Pages will be automatically published once content generation is complete.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

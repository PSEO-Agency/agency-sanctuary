import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Code, Check, X } from "lucide-react";

export default function IntegrationSettings() {
  const { subaccountId } = useParams();
  const [wordpressUrl, setWordpressUrl] = useState("");
  const [wordpressUsername, setWordpressUsername] = useState("");
  const [wordpressPassword, setWordpressPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchIntegrationSettings();
  }, [subaccountId]);

  const fetchIntegrationSettings = async () => {
    const { data } = await supabase
      .from('subaccounts')
      .select('integration_settings')
      .eq('id', subaccountId)
      .maybeSingle();
    
    const settings = data?.integration_settings as any;
    if (settings?.wordpress) {
      const wp = settings.wordpress;
      setWordpressUrl(wp.url || "");
      setWordpressUsername(wp.username || "");
      setWordpressPassword(wp.app_password || "");
      if (wp.url && wp.username && wp.app_password) {
        setConnectionStatus('success');
      }
    }
  };

  const testConnection = async () => {
    if (!wordpressUrl || !wordpressUsername || !wordpressPassword) {
      toast.error("Please fill in all WordPress credentials");
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-wordpress-connection', {
        body: {
          url: wordpressUrl,
          username: wordpressUsername,
          appPassword: wordpressPassword,
        }
      });

      if (error) throw error;

      if (data.success) {
        setConnectionStatus('success');
        toast.success("WordPress connection successful!");
      } else {
        setConnectionStatus('error');
        toast.error(data.error || "Failed to connect to WordPress");
      }
    } catch (error: any) {
      setConnectionStatus('error');
      toast.error(error.message || "Failed to test connection");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!wordpressUrl || !wordpressUsername || !wordpressPassword) {
      toast.error("Please fill in all WordPress credentials");
      return;
    }

    setLoading(true);
    try {
      const { data: currentData } = await supabase
        .from('subaccounts')
        .select('integration_settings')
        .eq('id', subaccountId)
        .maybeSingle();

      const currentSettings = (currentData?.integration_settings as any) || {};
      const updatedSettings = {
        ...currentSettings,
        wordpress: {
          url: wordpressUrl,
          username: wordpressUsername,
          app_password: wordpressPassword,
        }
      };

      const { error } = await supabase
        .from('subaccounts')
        .update({ integration_settings: updatedSettings })
        .eq('id', subaccountId);

      if (error) throw error;

      toast.success("WordPress integration saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save integration settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integrations</h2>
        <p className="text-muted-foreground">
          Connect your external services and tools
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code className="h-6 w-6" />
            <CardTitle>WordPress Integration</CardTitle>
          </div>
          <CardDescription>
            Connect your WordPress site to publish blog posts directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wpUrl">WordPress Site URL</Label>
            <Input
              id="wpUrl"
              placeholder="https://your-site.com"
              value={wordpressUrl}
              onChange={(e) => setWordpressUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter your WordPress site URL (without trailing slash)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wpUsername">Username</Label>
            <Input
              id="wpUsername"
              placeholder="admin"
              value={wordpressUsername}
              onChange={(e) => setWordpressUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wpPassword">Application Password</Label>
            <Input
              id="wpPassword"
              type="password"
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
              value={wordpressPassword}
              onChange={(e) => setWordpressPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Generate an application password in WordPress: Users → Profile → Application Passwords
            </p>
          </div>

          {connectionStatus !== 'idle' && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              connectionStatus === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
            }`}>
              {connectionStatus === 'success' ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="text-sm">WordPress connected successfully</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  <span className="text-sm">Failed to connect to WordPress</span>
                </>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing}
            >
              {testing ? "Testing..." : "Test Connection"}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

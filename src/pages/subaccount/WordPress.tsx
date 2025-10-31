import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Code, Check, X, Loader2, ExternalLink, FileText, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WordPress() {
  const { subaccountId } = useParams();
  const navigate = useNavigate();
  const [wordpressUrl, setWordpressUrl] = useState("");
  const [wordpressUsername, setWordpressUsername] = useState("");
  const [wordpressPassword, setWordpressPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isConfigured, setIsConfigured] = useState(false);

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
        setIsConfigured(true);
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

      setIsConfigured(true);
      toast.success("WordPress integration saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save integration settings");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
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
        wordpress: null,
      };

      const { error } = await supabase
        .from('subaccounts')
        .update({ integration_settings: updatedSettings })
        .eq('id', subaccountId);

      if (error) throw error;

      setWordpressUrl("");
      setWordpressUsername("");
      setWordpressPassword("");
      setConnectionStatus('idle');
      setIsConfigured(false);
      toast.success("WordPress disconnected successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect WordPress");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WordPress Integration</h1>
        <p className="text-muted-foreground mt-2">
          Connect and manage your WordPress site for seamless blog publishing
        </p>
      </div>

      {/* Quick Actions */}
      {isConfigured && connectionStatus === 'success' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/subaccount/${subaccountId}/blogs`)}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Manage Blogs</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create and publish blog posts to your WordPress site
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => window.open(wordpressUrl, '_blank')}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Visit WordPress</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Open your WordPress admin dashboard
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connection Status Alert */}
      {isConfigured && (
        <Alert className={connectionStatus === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'}>
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {connectionStatus === 'success' ? (
                <>
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-green-800 dark:text-green-200">
                    Connected to {wordpressUrl}
                  </span>
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-yellow-800 dark:text-yellow-200">
                    WordPress configured - Test connection to verify
                  </span>
                </>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="h-6 w-6 text-primary" />
              <CardTitle>WordPress Configuration</CardTitle>
            </div>
            {isConfigured && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={loading}
              >
                Disconnect
              </Button>
            )}
          </div>
          <CardDescription>
            Configure your WordPress REST API credentials to enable blog publishing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wpUrl">WordPress Site URL *</Label>
              <Input
                id="wpUrl"
                placeholder="https://your-site.com"
                value={wordpressUrl}
                onChange={(e) => {
                  setWordpressUrl(e.target.value);
                  setConnectionStatus('idle');
                }}
              />
              <p className="text-xs text-muted-foreground">
                Enter your WordPress site URL (without trailing slash)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wpUsername">WordPress Username *</Label>
              <Input
                id="wpUsername"
                placeholder="admin"
                value={wordpressUsername}
                onChange={(e) => {
                  setWordpressUsername(e.target.value);
                  setConnectionStatus('idle');
                }}
              />
              <p className="text-xs text-muted-foreground">
                Your WordPress admin username
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wpPassword">Application Password *</Label>
              <Input
                id="wpPassword"
                type="password"
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                value={wordpressPassword}
                onChange={(e) => {
                  setWordpressPassword(e.target.value);
                  setConnectionStatus('idle');
                }}
              />
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p className="text-xs font-medium">How to generate an Application Password:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Log into your WordPress admin dashboard</li>
                  <li>Go to Users → Profile</li>
                  <li>Scroll down to "Application Passwords" section</li>
                  <li>Enter a name (e.g., "Content Machine") and click "Add New Application Password"</li>
                  <li>Copy the generated password and paste it here</li>
                </ol>
              </div>
            </div>
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
                  <span className="text-sm font-medium">Connection verified successfully</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  <span className="text-sm font-medium">Failed to connect - Please verify your credentials</span>
                </>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing || !wordpressUrl || !wordpressUsername || !wordpressPassword}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || !wordpressUrl || !wordpressUsername || !wordpressPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Requirements:</strong> Your WordPress site must have the REST API enabled (enabled by default in WordPress 4.7+)
          </p>
          <p>
            <strong>Troubleshooting:</strong> If connection fails, ensure:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Your WordPress site is accessible and online</li>
            <li>The URL is correct (no trailing slash)</li>
            <li>The username and application password are correct</li>
            <li>REST API is not blocked by security plugins</li>
            <li>Your hosting allows external API connections</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

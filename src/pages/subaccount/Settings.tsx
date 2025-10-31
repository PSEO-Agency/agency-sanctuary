import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function Settings() {
  const { subaccountId } = useParams();
  const [subaccount, setSubaccount] = useState<any>(null);
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubaccount();
  }, [subaccountId]);

  const fetchSubaccount = async () => {
    const { data } = await supabase
      .from('subaccounts')
      .select('*')
      .eq('id', subaccountId)
      .single();
    
    if (data) {
      setSubaccount(data);
      setName(data.name);
      setLocationId(data.location_id);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('subaccounts')
      .update({ name, location_id: locationId })
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
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subaccount settings
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Update your subaccount information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Subaccount Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationId">Location ID</Label>
                <Input
                  id="locationId"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                />
              </div>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect your external services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-12 text-center">
                <p className="text-muted-foreground">Integrations coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

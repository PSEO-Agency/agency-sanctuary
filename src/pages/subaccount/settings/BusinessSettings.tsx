import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function BusinessSettings() {
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
      .maybeSingle();
    
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
        <h2 className="text-2xl font-bold">Business Settings</h2>
        <p className="text-muted-foreground">
          Manage your subaccount information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Update your subaccount details
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
    </div>
  );
}

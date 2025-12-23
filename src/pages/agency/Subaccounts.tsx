import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, LogIn, Search, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface Subaccount {
  id: string;
  name: string;
  location_id: string;
  created_at: string;
  airtable_base_id: string | null;
}

interface BusinessDetails {
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export default function Subaccounts() {
  const { agencyId } = useParams();
  const navigate = useNavigate();
  const [subaccounts, setSubaccounts] = useState<Subaccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSubaccount, setNewSubaccount] = useState({ 
    name: "",
    businessDetails: {} as BusinessDetails
  });
  const { impersonateUser } = useAuth();

  useEffect(() => {
    fetchSubaccounts();
  }, [agencyId]);

  const fetchSubaccounts = async () => {
    if (!agencyId) return;

    try {
      const { data, error } = await supabase
        .from("subaccounts")
        .select("id, name, location_id, created_at, airtable_base_id")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubaccounts(data || []);
    } catch (error) {
      console.error("Error fetching subaccounts:", error);
      toast.error("Failed to fetch sub-accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubaccount = async () => {
    if (!agencyId) return;

    try {
      setCreating(true);
      
      // Create the subaccount
      const { data: newSub, error } = await supabase
        .from("subaccounts")
        .insert([{
          agency_id: agencyId,
          name: newSubaccount.name,
          business_settings: newSubaccount.businessDetails as Record<string, any>
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Sub-account created successfully");
      
      // Trigger Airtable base setup in background
      try {
        console.log("Setting up Airtable base for subaccount:", newSub.id);
        const { data: airtableResult, error: airtableError } = await supabase.functions.invoke('setup-subaccount-airtable', {
          body: {
            subaccountId: newSub.id,
            subaccountName: newSub.name,
          }
        });
        
        if (airtableError) {
          console.error("Airtable setup error:", airtableError);
          toast.warning("Sub-account created, but Airtable setup may be pending.");
        } else if (airtableResult?.pending) {
          toast.info("Airtable base setup has been queued.");
        } else if (airtableResult?.baseId) {
          toast.success("Airtable base configured successfully!");
        }
      } catch (airtableErr) {
        console.error("Airtable setup failed:", airtableErr);
        // Don't fail the whole operation, just log it
      }
      
      setIsCreateOpen(false);
      setNewSubaccount({ 
        name: "",
        businessDetails: {} as BusinessDetails
      });
      fetchSubaccounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to create sub-account");
    } finally {
      setCreating(false);
    }
  };

  const updateBusinessDetails = (field: keyof BusinessDetails, value: string) => {
    setNewSubaccount(prev => ({
      ...prev,
      businessDetails: { ...prev.businessDetails, [field]: value }
    }));
  };

  const handleSwitchToSubaccount = (subaccountId: string) => {
    navigate(`/subaccount/${subaccountId}/launchpad`);
  };

  const handleLoginAs = async (subaccountId: string) => {
    try {
      // Find any user for this subaccount
      const { data: users } = await supabase
        .from("profiles")
        .select("id")
        .eq("sub_account_id", subaccountId)
        .limit(1);

      if (users && users.length > 0) {
        await impersonateUser(users[0].id);
      } else {
        toast.error("No user found for this sub-account");
      }
    } catch (error) {
      toast.error("Failed to impersonate user");
    }
  };

  const filteredSubaccounts = subaccounts.filter(subaccount =>
    subaccount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subaccount.location_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sub-accounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage your agency's sub-accounts
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Sub-account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Sub-account</DialogTitle>
              <DialogDescription>
                Add a new sub-account to your agency. Location ID will be auto-generated.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Basic Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    value={newSubaccount.name}
                    onChange={(e) => setNewSubaccount({ ...newSubaccount, name: e.target.value })}
                    placeholder="My Business"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newSubaccount.businessDetails.description || ""}
                    onChange={(e) => updateBusinessDetails("description", e.target.value)}
                    placeholder="Describe your business"
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Contact Information (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={newSubaccount.businessDetails.phone || ""}
                      onChange={(e) => updateBusinessDetails("phone", e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newSubaccount.businessDetails.email || ""}
                      onChange={(e) => updateBusinessDetails("email", e.target.value)}
                      placeholder="contact@business.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={newSubaccount.businessDetails.website || ""}
                    onChange={(e) => updateBusinessDetails("website", e.target.value)}
                    placeholder="https://www.business.com"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Address (Optional)</h3>
                <div className="space-y-2">
                  <Label htmlFor="streetAddress">Street Address</Label>
                  <Input
                    id="streetAddress"
                    value={newSubaccount.businessDetails.streetAddress || ""}
                    onChange={(e) => updateBusinessDetails("streetAddress", e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={newSubaccount.businessDetails.city || ""}
                      onChange={(e) => updateBusinessDetails("city", e.target.value)}
                      placeholder="San Francisco"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State / Province</Label>
                    <Input
                      id="state"
                      value={newSubaccount.businessDetails.state || ""}
                      onChange={(e) => updateBusinessDetails("state", e.target.value)}
                      placeholder="CA"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP / Postal Code</Label>
                    <Input
                      id="zipCode"
                      value={newSubaccount.businessDetails.zipCode || ""}
                      onChange={(e) => updateBusinessDetails("zipCode", e.target.value)}
                      placeholder="94102"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={newSubaccount.businessDetails.country || ""}
                      onChange={(e) => updateBusinessDetails("country", e.target.value)}
                      placeholder="United States"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleCreateSubaccount} 
                className="w-full"
                disabled={!newSubaccount.name.trim() || creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Sub-account"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sub-accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredSubaccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No sub-accounts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubaccounts.map((subaccount) => (
                  <TableRow key={subaccount.id}>
                    <TableCell className="font-medium">{subaccount.name}</TableCell>
                    <TableCell className="font-mono text-sm">{subaccount.location_id}</TableCell>
                    <TableCell>
                      {subaccount.airtable_base_id ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                          Pending Setup
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(subaccount.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleSwitchToSubaccount(subaccount.id)}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Switch To
                        </Button>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleLoginAs(subaccount.id)}
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          Login As
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Link, Copy, Check, LogIn, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CountryPartner {
  id: string;
  name: string;
  country: string | null;
  owner_user_id: string | null;
  created_at: string;
  agencies_count?: number;
}

interface PartnerInvite {
  id: string;
  token: string;
  email: string | null;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function Partners() {
  const [partners, setPartners] = useState<CountryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({ name: "", country: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const { impersonateUser } = useAuth();

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      // Fetch partners
      const { data: partnersData, error: partnersError } = await supabase
        .from("country_partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (partnersError) throw partnersError;

      // Count agencies for each partner
      const partnersWithCounts = await Promise.all(
        (partnersData || []).map(async (partner) => {
          const { count } = await supabase
            .from("agencies")
            .select("*", { count: "exact", head: true })
            .eq("country_partner_id", partner.id);
          
          return {
            ...partner,
            agencies_count: count || 0,
          };
        })
      );

      setPartners(partnersWithCounts);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to fetch country partners");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePartner = async () => {
    if (!newPartner.name) {
      toast.error("Partner name is required");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from("country_partners")
        .insert([{ 
          name: newPartner.name, 
          country: newPartner.country || null 
        }]);

      if (error) throw error;
      
      toast.success("Country partner created successfully");
      setIsCreateOpen(false);
      setNewPartner({ name: "", country: "" });
      fetchPartners();
    } catch (error: any) {
      toast.error(error.message || "Failed to create partner");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateInvite = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-partner-invite", {
        body: { email: inviteEmail || undefined, baseUrl: window.location.origin },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedLink(data.inviteUrl);
      toast.success("Partner invite link generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate invite");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoginAs = async (partnerId: string) => {
    try {
      // Find user with country_partner role for this partner
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "country_partner")
        .eq("context_id", partnerId)
        .limit(1);

      if (roles && roles.length > 0) {
        await impersonateUser(roles[0].user_id);
      } else {
        toast.error("No user found for this partner");
      }
    } catch (error) {
      toast.error("Failed to impersonate user");
    }
  };

  const filteredPartners = partners.filter(partner =>
    partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (partner.country && partner.country.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Country Partners</h1>
          <p className="text-muted-foreground mt-2">
            Manage regional partners who oversee agencies in their territories
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isInviteOpen} onOpenChange={(open) => { setIsInviteOpen(open); if (!open) { setGeneratedLink(""); setInviteEmail(""); } }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Link className="mr-2 h-4 w-4" />
                Generate Invite Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Partner Invite Link</DialogTitle>
                <DialogDescription>
                  Create an invite link for a new country partner to sign up
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email (optional)</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="partner@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, only this email can use the invite link
                  </p>
                </div>
                
                {generatedLink ? (
                  <div className="space-y-2">
                    <Label>Invite Link</Label>
                    <div className="flex gap-2">
                      <Input value={generatedLink} readOnly className="text-xs" />
                      <Button onClick={copyToClipboard} size="icon" variant="outline">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={handleGenerateInvite} className="w-full" disabled={generating}>
                    {generating ? "Generating..." : "Generate Link"}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Partner
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Country Partner</DialogTitle>
                <DialogDescription>
                  Add a new country partner (without user assignment)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Partner Name</Label>
                  <Input
                    id="name"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                    placeholder="Netherlands Partner"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country / Region</Label>
                  <Input
                    id="country"
                    value={newPartner.country}
                    onChange={(e) => setNewPartner({ ...newPartner, country: e.target.value })}
                    placeholder="NL"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePartner} disabled={creating}>
                  {creating ? "Creating..." : "Create Partner"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search partners..."
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
                <TableHead>Country</TableHead>
                <TableHead>Agencies</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredPartners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No country partners found</TableCell>
                </TableRow>
              ) : (
                filteredPartners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell>
                      {partner.country ? (
                        <Badge variant="outline">
                          <Globe className="h-3 w-3 mr-1" />
                          {partner.country}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{partner.agencies_count}</Badge>
                    </TableCell>
                    <TableCell>{new Date(partner.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">Manage</Button>
                        {partner.owner_user_id && (
                          <Button variant="secondary" size="sm" onClick={() => handleLoginAs(partner.id)}>
                            <LogIn className="mr-2 h-4 w-4" />
                            Login As
                          </Button>
                        )}
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

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, LogIn, Search, Link, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Agency {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  owner_user_id: string | null;
}

interface Invite {
  id: string;
  token: string;
  email: string | null;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function Agencies() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newAgency, setNewAgency] = useState({ name: "", slug: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { impersonateUser } = useAuth();

  useEffect(() => {
    fetchAgencies();
    fetchInvites();
  }, []);

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAgencies(data || []);
    } catch (error) {
      console.error("Error fetching agencies:", error);
      toast.error("Failed to fetch agencies");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from("agency_invites")
        .select("*")
        .eq("invite_type", "agency")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error("Error fetching invites:", error);
    }
  };

  const handleCreateAgency = async () => {
    try {
      const { error } = await supabase
        .from("agencies")
        .insert([{ name: newAgency.name, slug: newAgency.slug }]);

      if (error) throw error;
      
      toast.success("Agency created successfully");
      setIsCreateOpen(false);
      setNewAgency({ name: "", slug: "" });
      fetchAgencies();
    } catch (error: any) {
      toast.error(error.message || "Failed to create agency");
    }
  };

  const handleGenerateInvite = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-agency-invite", {
        body: { email: inviteEmail || undefined, baseUrl: window.location.origin },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedLink(data.inviteUrl);
      toast.success("Invite link generated!");
      fetchInvites();
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

  const handleLoginAs = async (agencyId: string) => {
    try {
      const { data: users } = await supabase
        .from("profiles")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("role", "agency_admin")
        .limit(1);

      if (users && users.length > 0) {
        await impersonateUser(users[0].id);
      } else {
        toast.error("No admin user found for this agency");
      }
    } catch (error) {
      toast.error("Failed to impersonate user");
    }
  };

  const filteredAgencies = agencies.filter(agency =>
    agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agency.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agencies</h1>
          <p className="text-muted-foreground mt-2">
            Manage all agencies in the system
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
                <DialogTitle>Generate Agency Invite Link</DialogTitle>
                <DialogDescription>
                  Create an invite link for a new agency owner to sign up
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
                    placeholder="agency@example.com"
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
                Create Agency
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Agency</DialogTitle>
                <DialogDescription>
                  Add a new agency to the system (without owner)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agency Name</Label>
                  <Input
                    id="name"
                    value={newAgency.name}
                    onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value })}
                    placeholder="Acme Agency"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={newAgency.slug}
                    onChange={(e) => setNewAgency({ ...newAgency, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="acme-agency"
                  />
                </div>
                <Button onClick={handleCreateAgency} className="w-full">
                  Create Agency
                </Button>
              </div>
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
                placeholder="Search agencies..."
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
                <TableHead>Slug</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredAgencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No agencies found</TableCell>
                </TableRow>
              ) : (
                filteredAgencies.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell className="font-medium">{agency.name}</TableCell>
                    <TableCell>{agency.slug}</TableCell>
                    <TableCell>{new Date(agency.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">Manage</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleLoginAs(agency.id)}>
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

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
import { Plus, LogIn, Search } from "lucide-react";
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

export default function Agencies() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAgency, setNewAgency] = useState({ name: "", slug: "" });
  const { impersonateUser } = useAuth();

  useEffect(() => {
    fetchAgencies();
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

  const handleLoginAs = async (agencyId: string) => {
    try {
      // Find the agency owner or any admin user for this agency
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
                Add a new agency to the system
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
                <Label htmlFor="slug">Slug (unique identifier)</Label>
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
                  <TableCell colSpan={4} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredAgencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No agencies found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgencies.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell className="font-medium">{agency.name}</TableCell>
                    <TableCell>{agency.slug}</TableCell>
                    <TableCell>
                      {new Date(agency.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleLoginAs(agency.id)}
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

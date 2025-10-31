import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

interface Subaccount {
  id: string;
  name: string;
  location_id: string;
  created_at: string;
}

export default function Subaccounts() {
  const { agencyId } = useParams();
  const [subaccounts, setSubaccounts] = useState<Subaccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSubaccount, setNewSubaccount] = useState({ name: "", location_id: "" });
  const { impersonateUser } = useAuth();

  useEffect(() => {
    fetchSubaccounts();
  }, [agencyId]);

  const fetchSubaccounts = async () => {
    if (!agencyId) return;

    try {
      const { data, error } = await supabase
        .from("subaccounts")
        .select("*")
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
      const { error } = await supabase
        .from("subaccounts")
        .insert([{
          agency_id: agencyId,
          name: newSubaccount.name,
          location_id: newSubaccount.location_id,
        }]);

      if (error) throw error;
      
      toast.success("Sub-account created successfully");
      setIsCreateOpen(false);
      setNewSubaccount({ name: "", location_id: "" });
      fetchSubaccounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to create sub-account");
    }
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Sub-account</DialogTitle>
              <DialogDescription>
                Add a new sub-account to your agency
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Sub-account Name</Label>
                <Input
                  id="name"
                  value={newSubaccount.name}
                  onChange={(e) => setNewSubaccount({ ...newSubaccount, name: e.target.value })}
                  placeholder="My Business"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_id">Location ID (unique)</Label>
                <Input
                  id="location_id"
                  value={newSubaccount.location_id}
                  onChange={(e) => setNewSubaccount({ ...newSubaccount, location_id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="my-business-001"
                />
              </div>
              <Button onClick={handleCreateSubaccount} className="w-full">
                Create Sub-account
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
              ) : filteredSubaccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No sub-accounts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubaccounts.map((subaccount) => (
                  <TableRow key={subaccount.id}>
                    <TableCell className="font-medium">{subaccount.name}</TableCell>
                    <TableCell>{subaccount.location_id}</TableCell>
                    <TableCell>
                      {new Date(subaccount.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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

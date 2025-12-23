import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, ArrowRightLeft, Eye, Trash2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Subaccount {
  id: string;
  name: string;
  location_id: string;
  agency_id: string;
  created_at: string;
  agency?: {
    id: string;
    name: string;
    is_main: boolean;
  };
}

interface Agency {
  id: string;
  name: string;
  is_main: boolean;
}

export default function Subaccounts() {
  const [subaccounts, setSubaccounts] = useState<Subaccount[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAgency, setFilterAgency] = useState<string>("all");
  
  // Transfer dialog state
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedSubaccount, setSelectedSubaccount] = useState<Subaccount | null>(null);
  const [targetAgencyId, setTargetAgencyId] = useState<string>("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subaccounts with agency info
      const { data: subaccountsData, error: subaccountsError } = await supabase
        .from("subaccounts")
        .select(`
          *,
          agency:agencies(id, name, is_main)
        `)
        .order("created_at", { ascending: false });

      if (subaccountsError) throw subaccountsError;
      
      // Fetch all agencies for filter and transfer
      const { data: agenciesData, error: agenciesError } = await supabase
        .from("agencies")
        .select("id, name, is_main")
        .order("name");

      if (agenciesError) throw agenciesError;
      
      setSubaccounts(subaccountsData || []);
      setAgencies(agenciesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch subaccounts");
    } finally {
      setLoading(false);
    }
  };

  const handleTransferClick = (subaccount: Subaccount) => {
    setSelectedSubaccount(subaccount);
    setTargetAgencyId("");
    setIsTransferOpen(true);
  };

  const handleTransfer = async () => {
    if (!selectedSubaccount || !targetAgencyId) return;
    
    try {
      setTransferring(true);
      
      // Direct transfer by super admin - update subaccount's agency_id
      const { error } = await supabase
        .from("subaccounts")
        .update({ agency_id: targetAgencyId })
        .eq("id", selectedSubaccount.id);

      if (error) throw error;
      
      toast.success(`Subaccount "${selectedSubaccount.name}" transferred successfully`);
      setIsTransferOpen(false);
      setSelectedSubaccount(null);
      fetchData();
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast.error(error.message || "Failed to transfer subaccount");
    } finally {
      setTransferring(false);
    }
  };

  const filteredSubaccounts = subaccounts.filter(sub => {
    const matchesSearch = 
      sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.location_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAgency = filterAgency === "all" || sub.agency_id === filterAgency;
    
    return matchesSearch && matchesAgency;
  });

  const getAgencyBadge = (agency?: { name: string; is_main: boolean }) => {
    if (!agency) return <Badge variant="outline">Unknown</Badge>;
    
    return (
      <Badge variant={agency.is_main ? "default" : "secondary"}>
        {agency.name}
        {agency.is_main && " (Main)"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subaccounts</h1>
        <p className="text-muted-foreground mt-2">
          Manage all subaccounts across agencies
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or location ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterAgency} onValueChange={setFilterAgency}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by agency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agencies</SelectItem>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}{agency.is_main ? " (Main)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location ID</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredSubaccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No subaccounts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubaccounts.map((subaccount) => (
                  <TableRow key={subaccount.id}>
                    <TableCell className="font-medium">{subaccount.name}</TableCell>
                    <TableCell className="font-mono text-sm">{subaccount.location_id}</TableCell>
                    <TableCell>{getAgencyBadge(subaccount.agency)}</TableCell>
                    <TableCell>
                      {new Date(subaccount.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleTransferClick(subaccount)}
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-1" />
                          Transfer
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

      {/* Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Subaccount</DialogTitle>
            <DialogDescription>
              Move "{selectedSubaccount?.name}" to a different agency
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Agency</Label>
              <div className="p-2 bg-muted rounded-md">
                {selectedSubaccount?.agency?.name || "Unknown"}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target-agency">Transfer To</Label>
              <Select value={targetAgencyId} onValueChange={setTargetAgencyId}>
                <SelectTrigger id="target-agency">
                  <SelectValue placeholder="Select target agency" />
                </SelectTrigger>
                <SelectContent>
                  {agencies
                    .filter(a => a.id !== selectedSubaccount?.agency_id)
                    .map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name}{agency.is_main ? " (Main)" : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransfer} 
              disabled={!targetAgencyId || transferring}
            >
              {transferring ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { Search, ArrowRightLeft, Eye, Trash2, Building2, ArrowUpCircle, Loader2, Globe, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DeleteSubaccountDialog } from "@/components/DeleteSubaccountDialog";
import { useAuth } from "@/contexts/AuthContext";

interface CountryPartner {
  id: string;
  name: string;
  country: string | null;
}

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
    country_partner_id: string | null;
    country_partner?: CountryPartner | null;
  };
}

interface Agency {
  id: string;
  name: string;
  is_main: boolean;
  country_partner_id: string | null;
}

interface SubaccountUser {
  id: string;
  email: string;
  full_name: string | null;
}

export default function Subaccounts() {
  const [subaccounts, setSubaccounts] = useState<Subaccount[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [partners, setPartners] = useState<CountryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAgency, setFilterAgency] = useState<string>("all");
  const [filterPartner, setFilterPartner] = useState<string>("all");
  const { hasRole } = useAuth();
  
  const isSuperAdmin = hasRole("super_admin");
  const isCountryPartner = hasRole("country_partner");
  
  // Transfer dialog state
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedSubaccount, setSelectedSubaccount] = useState<Subaccount | null>(null);
  const [targetAgencyId, setTargetAgencyId] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  
  // Delete dialog state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [subaccountToDelete, setSubaccountToDelete] = useState<Subaccount | null>(null);

  // Upgrade dialog state
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeSubaccount, setUpgradeSubaccount] = useState<Subaccount | null>(null);
  const [upgradeUser, setUpgradeUser] = useState<SubaccountUser | null>(null);
  const [upgradeAgencyName, setUpgradeAgencyName] = useState("");
  const [upgradeAgencySlug, setUpgradeAgencySlug] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: subaccountsData, error: subaccountsError } = await supabase
        .from("subaccounts")
        .select(`
          *,
          agency:agencies(id, name, is_main, country_partner_id, country_partner:country_partners(id, name, country))
        `)
        .order("created_at", { ascending: false });

      if (subaccountsError) throw subaccountsError;
      
      const { data: agenciesData, error: agenciesError } = await supabase
        .from("agencies")
        .select("id, name, is_main, country_partner_id")
        .order("name");

      if (agenciesError) throw agenciesError;

      // Fetch partners for super admin filtering
      if (isSuperAdmin) {
        const { data: partnersData, error: partnersError } = await supabase
          .from("country_partners")
          .select("id, name, country")
          .order("name");

        if (!partnersError && partnersData) {
          setPartners(partnersData);
        }
      }
      
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

  const handleDeleteClick = (subaccount: Subaccount) => {
    setSubaccountToDelete(subaccount);
    setIsDeleteOpen(true);
  };

  const handleUpgradeClick = async (subaccount: Subaccount) => {
    setUpgradeSubaccount(subaccount);
    setUpgradeAgencyName("");
    setUpgradeAgencySlug("");
    setUpgradeUser(null);
    setIsUpgradeOpen(true);
    
    // Find the owner of this subaccount
    setLoadingUsers(true);
    try {
      const { data: users, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("sub_account_id", subaccount.id)
        .limit(1);
      
      if (error) throw error;
      if (users && users.length > 0) {
        setUpgradeUser(users[0]);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleUpgrade = async () => {
    if (!upgradeSubaccount || !upgradeUser || !upgradeAgencyName || !upgradeAgencySlug) return;
    
    try {
      setUpgrading(true);
      
      const { data, error } = await supabase.functions.invoke("upgrade-to-agency", {
        body: {
          userId: upgradeUser.id,
          agencyName: upgradeAgencyName,
          agencySlug: upgradeAgencySlug,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success(`User upgraded to agency "${upgradeAgencyName}" successfully!`);
      setIsUpgradeOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast.error(error.message || "Failed to upgrade user");
    } finally {
      setUpgrading(false);
    }
  };

  const filteredSubaccounts = subaccounts.filter(sub => {
    const matchesSearch = 
      sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.location_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAgency = filterAgency === "all" || sub.agency_id === filterAgency;
    
    const matchesPartner = 
      filterPartner === "all" || 
      (filterPartner === "none" && !sub.agency?.country_partner_id) ||
      sub.agency?.country_partner_id === filterPartner;
    
    return matchesSearch && matchesAgency && matchesPartner;
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
          {isCountryPartner && !isSuperAdmin 
            ? "Manage subaccounts within your partner region's agencies"
            : "Manage all subaccounts across agencies"
          }
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
            {isSuperAdmin && partners.length > 0 && (
              <Select value={filterPartner} onValueChange={setFilterPartner}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Globe className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by partner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Partners</SelectItem>
                  <SelectItem value="none">No Partner</SelectItem>
                  {partners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location ID</TableHead>
                <TableHead>Agency</TableHead>
                {isSuperAdmin && <TableHead>Partner</TableHead>}
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredSubaccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8">
                    No subaccounts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubaccounts.map((subaccount) => (
                  <TableRow key={subaccount.id}>
                    <TableCell className="font-medium">{subaccount.name}</TableCell>
                    <TableCell className="font-mono text-sm">{subaccount.location_id}</TableCell>
                    <TableCell>{getAgencyBadge(subaccount.agency)}</TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {subaccount.agency?.country_partner ? (
                          <Badge variant="outline">
                            <Globe className="h-3 w-3 mr-1" />
                            {subaccount.agency.country_partner.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {new Date(subaccount.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTransferClick(subaccount)}>
                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                              Transfer
                            </DropdownMenuItem>
                            {isSuperAdmin && (
                              <DropdownMenuItem onClick={() => handleUpgradeClick(subaccount)}>
                                <ArrowUpCircle className="h-4 w-4 mr-2" />
                                Upgrade to Agency
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(subaccount)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Upgrade to Agency Dialog */}
      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Agency</DialogTitle>
            <DialogDescription>
              Create a new agency for the owner of "{upgradeSubaccount?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !upgradeUser ? (
              <div className="text-center py-4 text-muted-foreground">
                No user found for this subaccount
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>User to Upgrade</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">{upgradeUser.full_name || "No name"}</p>
                    <p className="text-sm text-muted-foreground">{upgradeUser.email}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="agencyName">New Agency Name</Label>
                  <Input
                    id="agencyName"
                    value={upgradeAgencyName}
                    onChange={(e) => {
                      setUpgradeAgencyName(e.target.value);
                      setUpgradeAgencySlug(generateSlug(e.target.value));
                    }}
                    placeholder="User's Agency"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="agencySlug">Agency Slug</Label>
                  <Input
                    id="agencySlug"
                    value={upgradeAgencySlug}
                    onChange={(e) => setUpgradeAgencySlug(e.target.value)}
                    placeholder="users-agency"
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  The user will become an agency admin while retaining access to their original subaccount.
                </p>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpgrade} 
              disabled={!upgradeUser || !upgradeAgencyName || !upgradeAgencySlug || upgrading}
            >
              {upgrading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Upgrading...
                </>
              ) : (
                "Upgrade to Agency"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteSubaccountDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        subaccount={subaccountToDelete}
        onDeleted={fetchData}
      />
    </div>
  );
}

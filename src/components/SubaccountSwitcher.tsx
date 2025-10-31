import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Building2, Search } from "lucide-react";

interface Subaccount {
  id: string;
  name: string;
}

export function SubaccountSwitcher() {
  const [subaccounts, setSubaccounts] = useState<Subaccount[]>([]);
  const [currentSubaccount, setCurrentSubaccount] = useState<Subaccount | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.sub_account_id) {
      fetchCurrentSubaccount();
    }
  }, [profile?.sub_account_id]);

  const fetchCurrentSubaccount = async () => {
    if (!profile?.sub_account_id) return;
    const { data } = await supabase
      .from('subaccounts')
      .select('id, name')
      .eq('id', profile.sub_account_id)
      .single();
    
    if (data) {
      setCurrentSubaccount(data);
    }
  };

  const fetchSubaccounts = async () => {
    if (!profile?.agency_id) return;
    const { data } = await supabase
      .from('subaccounts')
      .select('id, name')
      .eq('agency_id', profile.agency_id)
      .order('name');
    
    if (data) {
      setSubaccounts(data);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchSubaccounts();
      setSearchTerm("");
    }
  };

  const filteredSubaccounts = subaccounts.filter(sub =>
    sub.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSwitch = (subaccountId: string) => {
    navigate(`/subaccount/${subaccountId}/dashboard`);
  };

  const handleBackToAgency = () => {
    navigate(`/agency/${profile?.agency_id}`);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3 py-2 bg-background/80 hover:bg-background rounded-xl border border-border/50 text-foreground">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 flex-shrink-0 text-foreground" />
            <span className="truncate text-sm text-foreground">
              {currentSubaccount?.name || "Agency Portal"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-background z-50">
        <DropdownMenuLabel className="px-2">Switch Account</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        
        <DropdownMenuItem 
          onClick={handleBackToAgency}
          className="rounded-lg cursor-pointer"
        >
          <Building2 className="mr-2 h-4 w-4" />
          Agency Portal
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-border/50" />
        
        <div className="px-2 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subaccounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 bg-background/50 rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {filteredSubaccounts.length > 0 ? (
            filteredSubaccounts.map((subaccount) => (
              <DropdownMenuItem
                key={subaccount.id}
                onClick={() => handleSwitch(subaccount.id)}
                className={`rounded-lg cursor-pointer ${
                  currentSubaccount?.id === subaccount.id ? "bg-primary/10 text-primary" : ""
                }`}
              >
                {subaccount.name}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="text-center">
              {searchTerm ? "No matches found" : "No subaccounts yet"}
            </DropdownMenuItem>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

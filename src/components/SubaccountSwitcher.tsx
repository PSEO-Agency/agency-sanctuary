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
import { ChevronDown, Building2 } from "lucide-react";

interface Subaccount {
  id: string;
  name: string;
}

export function SubaccountSwitcher() {
  const [subaccounts, setSubaccounts] = useState<Subaccount[]>([]);
  const [currentSubaccount, setCurrentSubaccount] = useState<Subaccount | null>(null);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.agency_id) {
      fetchSubaccounts();
    }
  }, [profile?.agency_id]);

  const fetchSubaccounts = async () => {
    const { data } = await supabase
      .from('subaccounts')
      .select('id, name')
      .eq('agency_id', profile?.agency_id)
      .order('name');
    
    if (data) {
      setSubaccounts(data);
      if (profile?.sub_account_id) {
        const current = data.find(s => s.id === profile.sub_account_id);
        setCurrentSubaccount(current || null);
      }
    }
  };

  const handleSwitch = (subaccountId: string) => {
    navigate(`/subaccount/${subaccountId}/dashboard`);
  };

  const handleBackToAgency = () => {
    navigate(`/agency/${profile?.agency_id}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-2">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate text-sm">
              {currentSubaccount?.name || "Agency Portal"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-background z-50">
        <DropdownMenuLabel>Switch Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleBackToAgency}>
          <Building2 className="mr-2 h-4 w-4" />
          Agency Portal
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Subaccounts
        </DropdownMenuLabel>
        {subaccounts.map((subaccount) => (
          <DropdownMenuItem
            key={subaccount.id}
            onClick={() => handleSwitch(subaccount.id)}
            className={currentSubaccount?.id === subaccount.id ? "bg-muted" : ""}
          >
            {subaccount.name}
          </DropdownMenuItem>
        ))}
        {subaccounts.length === 0 && (
          <DropdownMenuItem disabled>
            No subaccounts yet
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

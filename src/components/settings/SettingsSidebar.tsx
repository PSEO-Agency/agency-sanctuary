import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Building2, User, Plug, CreditCard, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { SubaccountSwitcher } from "@/components/SubaccountSwitcher";

interface SettingsSidebarProps {
  subaccountId: string;
}

export function SettingsSidebar({ subaccountId }: SettingsSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  
  const menuItems = [
    {
      title: "Business Settings",
      icon: Building2,
      path: `/subaccount/${subaccountId}/settings`,
    },
    {
      title: "My Profile",
      icon: User,
      path: `/subaccount/${subaccountId}/settings/profile`,
    },
    {
      title: "Integrations",
      icon: Plug,
      path: `/subaccount/${subaccountId}/settings/integrations`,
    },
    {
      title: "Billing",
      icon: CreditCard,
      path: `/subaccount/${subaccountId}/settings/billing`,
    },
  ];

  const handleBack = () => {
    navigate(`/subaccount/${subaccountId}/dashboard`);
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="pt-20 px-2">
        {!collapsed && (
          <>
            <div className="mb-4">
              <SubaccountSwitcher />
            </div>
            <Button
              variant="ghost"
              onClick={handleBack}
              className="w-full justify-start gap-2 bg-background/80 hover:bg-background rounded-xl border border-border/50 text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            onClick={handleBack}
            className="w-full p-2 bg-background/80 hover:bg-background rounded-xl"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
      </SidebarHeader>
      
      <SidebarContent className="px-2 pt-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-primary/10"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            );
          })}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}

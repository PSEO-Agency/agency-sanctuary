import { NavLink, useLocation } from "react-router-dom";
import { Building2, User, Plug, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSidebarProps {
  subaccountId: string;
}

export function SettingsSidebar({ subaccountId }: SettingsSidebarProps) {
  const location = useLocation();
  
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

  return (
    <aside className="w-64 border-r bg-muted/30 p-4">
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
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

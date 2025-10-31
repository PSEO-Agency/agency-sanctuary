import { Building2, LayoutDashboard, Settings, Users } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface AgencySidebarProps {
  agencyId: string;
}

export function AgencySidebar({ agencyId }: AgencySidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const menuItems = [
    { title: "Dashboard", url: `/agency/${agencyId}`, icon: LayoutDashboard },
    { title: "Sub-accounts", url: `/agency/${agencyId}/subaccounts`, icon: Building2 },
    { title: "Team", url: `/agency/${agencyId}/team`, icon: Users },
    { title: "Settings", url: `/agency/${agencyId}/settings`, icon: Settings },
  ];

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <div className="p-6 border-b">
        <h1 className={`text-xl font-bold bg-gradient-sidebar bg-clip-text text-transparent ${collapsed ? "text-center" : ""}`}>
          {collapsed ? "PS" : "PSEO Builder"}
        </h1>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Agency Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <NavLink to={item.url} end>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

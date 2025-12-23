import { Building2, LayoutDashboard, Settings, Users } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SubaccountSwitcher } from "./SubaccountSwitcher";

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
  ];

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent className="flex-1 pt-16">
        {!collapsed && (
          <div className="px-2 py-2 mt-2">
            <SubaccountSwitcher />
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 uppercase text-xs">
            Agency Portal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={isActive ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-primary/10"}
                    >
                      <NavLink to={item.url} end>
                        <item.icon className="h-5 w-5" />
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

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className={location.pathname === `/agency/${agencyId}/settings` 
                ? "bg-primary/10 text-primary" 
                : "text-sidebar-foreground hover:bg-primary/10"}
            >
              <NavLink to={`/agency/${agencyId}/settings`} end>
                <Settings className="h-5 w-5" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

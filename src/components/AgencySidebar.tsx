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
import { cn } from "@/lib/utils";

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

  const getMenuItemClassName = (isActive: boolean) => {
    if (isActive) {
      return "bg-white/15 text-white font-medium hover:bg-white/20";
    }
    return "text-white/80 hover:bg-white/10 hover:text-white";
  };

  const getIconClassName = (isActive: boolean) => {
    if (isActive) {
      return "h-5 w-5 text-white";
    }
    return "h-5 w-5 text-white/70";
  };

  const gradientStyle = { background: 'linear-gradient(to bottom, hsl(217 91% 55%), hsl(224 76% 48%))' };

  return (
    <Sidebar 
      className={cn(
        collapsed ? "w-14" : "w-60",
        "m-3 rounded-2xl shadow-xl overflow-hidden border-0"
      )} 
      collapsible="icon"
      style={gradientStyle}
    >
      <SidebarContent className="flex-1 pt-16">
        {!collapsed && (
          <div className="px-2 py-2 mt-2">
            <SubaccountSwitcher />
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 uppercase text-xs">
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
                      className={getMenuItemClassName(isActive)}
                    >
                      <NavLink to={item.url} end>
                        <item.icon className={getIconClassName(isActive)} />
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

      <SidebarFooter className="border-t border-white/10 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className={getMenuItemClassName(location.pathname === `/agency/${agencyId}/settings`)}
            >
              <NavLink to={`/agency/${agencyId}/settings`} end>
                <Settings className={getIconClassName(location.pathname === `/agency/${agencyId}/settings`)} />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

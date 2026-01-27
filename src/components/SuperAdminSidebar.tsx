import { Building2, LayoutDashboard, Settings, Building, Users, Globe } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function SuperAdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, hasRole } = useAuth();
  const collapsed = state === "collapsed";

  const isSuperAdmin = hasRole("super_admin");
  const isCountryPartner = hasRole("country_partner");

  // Determine which gradient to use based on role
  const isPartnerOnly = isCountryPartner && !isSuperAdmin;
  const gradientStyle = isPartnerOnly 
    ? { background: 'linear-gradient(to bottom, hsl(25 95% 53%), hsl(38 92% 50%))' }
    : { background: 'linear-gradient(to bottom, hsl(220 13% 33%), hsl(217 19% 27%))' };

  // Build menu items based on role
  const menuItems = [
    { title: "Dashboard", url: "/super-admin", icon: LayoutDashboard },
    { title: "Agencies", url: "/super-admin/agencies", icon: Building2 },
    { title: "Subaccounts", url: "/super-admin/subaccounts", icon: Users },
  ];

  // Only super admins can see the Partners page
  if (isSuperAdmin) {
    menuItems.push({ title: "Country Partners", url: "/super-admin/partners", icon: Globe });
  }

  const portalLabel = isPartnerOnly ? "Partner Portal" : "Super Admin";

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

  return (
    <Sidebar 
      className={cn(
        collapsed ? "w-14" : "w-60",
        "m-3 rounded-2xl shadow-xl overflow-hidden border-0"
      )} 
      collapsible="icon"
      style={gradientStyle}
    >
      <SidebarContent className="pt-16">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 uppercase text-xs">
            {portalLabel}
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
              
              {/* My Agency Link - only for super admins with an agency */}
              {isSuperAdmin && profile?.agency_id && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    className="text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={() => navigate(`/agency/${profile.agency_id}`)}
                  >
                    <Building className="h-5 w-5 text-white/70" />
                    {!collapsed && <span>My Agency</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className={getMenuItemClassName(location.pathname === "/super-admin/settings")}
            >
              <NavLink to="/super-admin/settings">
                <Settings className={getIconClassName(location.pathname === "/super-admin/settings")} />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

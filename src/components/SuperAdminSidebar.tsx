import { Building2, LayoutDashboard, Settings, Building, Users, Globe, Lightbulb, Megaphone } from "lucide-react";
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

  // Determine which style to use based on role
  const isPartnerOnly = isCountryPartner && !isSuperAdmin;
  
  // Partner: orange gradient with white text
  // Super Admin: white/neutral background with dark text
  const sidebarStyle = isPartnerOnly 
    ? { background: 'linear-gradient(to bottom, hsl(25 95% 53%), hsl(38 92% 50%))' }
    : { background: 'linear-gradient(to bottom, hsl(0 0% 100%), hsl(0 0% 98%))' };

  // Build menu items based on role
  const menuItems = [
    { title: "Dashboard", url: "/super-admin", icon: LayoutDashboard },
    { title: "Agencies", url: "/super-admin/agencies", icon: Building2 },
    { title: "Subaccounts", url: "/super-admin/subaccounts", icon: Users },
  ];

  // Only super admins can see the Partners, Announcements, and Features pages
  if (isSuperAdmin) {
    menuItems.push({ title: "Country Partners", url: "/super-admin/partners", icon: Globe });
    menuItems.push({ title: "Announcements", url: "/super-admin/announcements", icon: Megaphone });
    menuItems.push({ title: "Roadmap", url: "/super-admin/features", icon: Lightbulb });
  }

  const portalLabel = isPartnerOnly ? "Partner Portal" : "Super Admin";

  const getMenuItemClassName = (isActive: boolean) => {
    if (isPartnerOnly) {
      // Partner: white text on orange gradient
      if (isActive) {
        return "bg-white/15 text-white font-medium hover:bg-white/20";
      }
      return "text-white/80 hover:bg-white/10 hover:text-white";
    } else {
      // Super Admin: dark text on white background
      if (isActive) {
        return "bg-gray-100 text-gray-900 font-medium hover:bg-gray-200";
      }
      return "text-gray-600 hover:bg-gray-50 hover:text-gray-900";
    }
  };

  const getIconClassName = (isActive: boolean) => {
    if (isPartnerOnly) {
      // Partner: white icons
      if (isActive) {
        return "h-5 w-5 text-white";
      }
      return "h-5 w-5 text-white/70";
    } else {
      // Super Admin: gray icons
      if (isActive) {
        return "h-5 w-5 text-gray-900";
      }
      return "h-5 w-5 text-gray-500";
    }
  };
  
  const labelClassName = isPartnerOnly ? "text-white/50" : "text-gray-400";

  return (
    <Sidebar 
      variant="floating"
      className={cn(
        collapsed ? "w-14" : "w-60",
        "border-0",
        !isPartnerOnly && "border border-gray-200"
      )} 
      collapsible="icon"
      style={sidebarStyle}
    >
      <SidebarContent className="pt-1">
        <SidebarGroup>
          <SidebarGroupLabel className={cn("uppercase text-xs", labelClassName)}>
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
                    className={getMenuItemClassName(false)}
                    onClick={() => navigate(`/agency/${profile.agency_id}`)}
                  >
                    <Building className={getIconClassName(false)} />
                    {!collapsed && <span>My Agency</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("border-t p-2", isPartnerOnly ? "border-white/10" : "border-gray-200")}>
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

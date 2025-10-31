import { Home, FolderKanban, FileText, BarChart3, Settings, Wand2, Cog } from "lucide-react";
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

interface SubaccountSidebarProps {
  subaccountId: string;
}

export function SubaccountSidebar({ subaccountId }: SubaccountSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const pseoBuilderItems = [
    { title: "Dashboard", url: `/subaccount/${subaccountId}/dashboard`, icon: Home },
    { title: "Campaigns", url: `/subaccount/${subaccountId}/campaigns`, icon: FolderKanban },
    { title: "Pages", url: `/subaccount/${subaccountId}/pages`, icon: FileText },
    { title: "Reports", url: `/subaccount/${subaccountId}/reports`, icon: BarChart3 },
  ];

  const contentMachineItems = [
    { title: "WordPress Integration", url: `/subaccount/${subaccountId}/wordpress`, icon: Wand2 },
    { title: "Automation Builder", url: `/subaccount/${subaccountId}/automation`, icon: Cog },
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
            pSEO Builder
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pseoBuilderItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-primary/10"}
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 uppercase text-xs">
            Content Machine
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentMachineItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-primary/10"}
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
              className={location.pathname === `/subaccount/${subaccountId}/settings` 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-sidebar-foreground hover:bg-sidebar-primary/10"}
            >
              <NavLink to={`/subaccount/${subaccountId}/settings`} end>
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

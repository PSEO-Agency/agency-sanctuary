import { Home, FolderKanban, FileText, BarChart3, Settings, Wand2, Cog, Rocket } from "lucide-react";
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

  const launchpadItem = {
    title: "Launchpad",
    url: `/subaccount/${subaccountId}/launchpad`,
    icon: Rocket,
  };

  const contentMachineItems = [
    { title: "WordPress Integration", url: `/subaccount/${subaccountId}/wordpress`, icon: Wand2 },
    { title: "Projects", url: `/subaccount/${subaccountId}/projects`, icon: FolderKanban },
    { title: "Automation Builder", url: `/subaccount/${subaccountId}/automation`, icon: Cog },
  ];

  const pseoBuilderItems = [
    { title: "Dashboard", url: `/subaccount/${subaccountId}/dashboard`, icon: Home, disabled: true },
    { title: "Campaigns", url: `/subaccount/${subaccountId}/campaigns`, icon: FolderKanban, disabled: true },
    { title: "Reports", url: `/subaccount/${subaccountId}/reports`, icon: BarChart3, disabled: true },
  ];

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent className="flex-1 pt-16">
        {!collapsed && (
          <div className="px-2 py-2 mt-2">
            <SubaccountSwitcher subaccountId={subaccountId} />
          </div>
        )}

        {/* Launchpad Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={location.pathname === launchpadItem.url ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-primary/10"}
                >
                  <NavLink to={launchpadItem.url} end>
                    <launchpadItem.icon className="h-5 w-5" />
                    {!collapsed && <span>{launchpadItem.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content Machine Section */}
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

        {/* pSEO Builder Section */}
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
                      disabled={item.disabled}
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/50 cursor-not-allowed"}
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && (
                        <span className="flex items-center justify-between w-full">
                          {item.title}
                          {item.disabled && <span className="text-xs text-muted-foreground ml-2">Soon</span>}
                        </span>
                      )}
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


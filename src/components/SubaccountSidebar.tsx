import { Home, FolderKanban, FileText, BarChart3, Settings, Wand2 } from "lucide-react";
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
    { title: "WordPress", url: `/subaccount/${subaccountId}/wordpress`, icon: Wand2 },
    { title: "Automation", url: `/subaccount/${subaccountId}/automation`, icon: Settings },
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
          <SidebarGroupLabel>pSEO Builder</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pseoBuilderItems.map((item) => {
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

        <SidebarGroup>
          <SidebarGroupLabel>Content Machine</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentMachineItems.map((item) => {
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

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={location.pathname === `/subaccount/${subaccountId}/settings`}>
                  <NavLink to={`/subaccount/${subaccountId}/settings`} end>
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

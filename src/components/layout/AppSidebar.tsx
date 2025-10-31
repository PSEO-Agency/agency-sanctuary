import { Home, FolderKanban, FileText, BarChart3, Settings, Wand2, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface SidebarNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: SidebarNavItem[];
}

interface AppSidebarProps {
  basePath: string;
}

export function AppSidebar({ basePath }: AppSidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  const pseoBuilderItems: SidebarNavItem[] = [
    { title: "Dashboard", href: `${basePath}/dashboard`, icon: Home },
    { title: "Campaigns", href: `${basePath}/campaigns`, icon: FolderKanban },
    { title: "Pages", href: `${basePath}/pages`, icon: FileText },
    { title: "Reports", href: `${basePath}/reports`, icon: BarChart3 },
  ];

  const contentMachineItems: SidebarNavItem[] = [
    { title: "WordPress Integration", href: `${basePath}/wordpress`, icon: Wand2 },
    { title: "Automation Builder", href: `${basePath}/automation`, icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-sidebar w-64">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-foreground">
          PSEO Builder
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* PSEO Builder Section */}
        <div className="space-y-1">
          <h2 className="px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-2">
            PSEO Builder
          </h2>
          {pseoBuilderItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground transition-colors",
                location.pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-primary/10"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.title}</span>
            </Link>
          ))}
        </div>

        {/* Content Machine Section */}
        <div className="space-y-1">
          <h2 className="px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-2">
            Content Machine
          </h2>
          {contentMachineItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground transition-colors",
                location.pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-primary/10"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.title}</span>
            </Link>
          ))}
        </div>

        {/* Settings */}
        <div className="space-y-1">
          <Link
            to={`${basePath}/settings`}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground transition-colors",
              location.pathname === `${basePath}/settings`
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-primary/10"
            )}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {/* Sign Out Button */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-primary/10"
          onClick={() => signOut()}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

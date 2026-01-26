import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SubaccountSettingsLayoutProps {
  children: ReactNode;
  subaccountId: string;
}

export function SubaccountSettingsLayout({ children, subaccountId }: SubaccountSettingsLayoutProps) {
  const { signOut, profile, impersonation } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {impersonation?.isImpersonating && <ImpersonationBanner />}
        
        <header className="fixed top-0 left-0 right-0 h-16 bg-background border-b flex items-center justify-between px-6 z-50">
          <div className="flex items-center gap-4">
            <img src="/src/assets/logo.png" alt="Logo" className="h-8" />
            <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">(closed BETA)</span>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <button className="p-2 hover:bg-muted rounded-lg">
              <Bell className="h-5 w-5" />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-muted p-2 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 bg-background">
                <DropdownMenuItem onClick={() => signOut()}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <SettingsSidebar subaccountId={subaccountId} />
        
        <main className="flex-1 pt-16">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

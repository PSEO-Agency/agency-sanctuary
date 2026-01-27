import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AgencySidebar } from "@/components/AgencySidebar";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { Bell, User, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

interface AgencyLayoutProps {
  children: React.ReactNode;
  agencyId: string;
}

export function AgencyLayout({ children, agencyId }: AgencyLayoutProps) {
  const { user, profile, signOut, hasRole } = useAuth();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full flex-col theme-agency">
        <ImpersonationBanner />
        
        <header className="sticky top-0 z-50 h-16 flex items-center border-b bg-white px-6 gap-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <img src={logo} alt="PSEO Builder" className="h-8" />
            <span className="text-xs font-semibold bg-[hsl(var(--theme-primary))] text-white px-1.5 py-0.5 rounded">(closed BETA)</span>
          </div>

          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-50">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Agency Admin</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hasRole('super_admin') && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/super-admin')}>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Back to Super Admin
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => signOut()}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <AgencySidebar agencyId={agencyId} />
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

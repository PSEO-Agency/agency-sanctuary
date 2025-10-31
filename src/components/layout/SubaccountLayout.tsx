import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SubaccountSidebar } from "@/components/SubaccountSidebar";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

interface SubaccountLayoutProps {
  children: React.ReactNode;
  subaccountId: string;
}

export function SubaccountLayout({ children, subaccountId }: SubaccountLayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full flex-col">
        <ImpersonationBanner />
        
        <header className="sticky top-0 z-50 h-16 flex items-center border-b bg-white px-6 gap-6">
          {/* Logo Section */}
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <img src={logo} alt="PSEO Builder" className="h-8" />
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search..." className="pl-10" />
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="px-4 py-2 bg-success/10 text-success rounded-full font-medium text-sm">
              50 credits
            </div>

            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">My Account</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <SubaccountSidebar subaccountId={subaccountId} />
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

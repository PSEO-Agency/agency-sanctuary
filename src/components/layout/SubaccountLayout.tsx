import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface SubaccountLayoutProps {
  children: React.ReactNode;
  subaccountId: string;
}

export function SubaccountLayout({ children, subaccountId }: SubaccountLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar basePath={`/subaccount/${subaccountId}`} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

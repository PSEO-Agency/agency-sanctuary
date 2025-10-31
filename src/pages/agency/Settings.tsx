import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "./UserManagement";

export default function AgencySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your agency settings and team
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Team Management</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">White Label</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="general" className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <p className="text-muted-foreground">General settings coming soon...</p>
          </div>
        </TabsContent>
        
        <TabsContent value="branding" className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <p className="text-muted-foreground">White label settings coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

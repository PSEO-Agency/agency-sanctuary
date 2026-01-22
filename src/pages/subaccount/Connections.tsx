import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Globe } from "lucide-react";
import { useWordPressConnections } from "@/hooks/useWordPressConnections";
import { AddConnectionDialog } from "@/components/connections/AddConnectionDialog";
import { ConnectionCard } from "@/components/connections/ConnectionCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Connections() {
  const { subaccountId } = useParams();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const {
    connections,
    loading,
    createConnection,
    testConnection,
    updateConnection,
    deleteConnection,
    disconnectConnection,
  } = useWordPressConnections(subaccountId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connections</h1>
        <p className="text-muted-foreground">
          Manage your publishing destinations and integrations
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>WordPress</CardTitle>
                <CardDescription>
                  Connect your WordPress sites to publish content directly
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add WordPress Site
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No WordPress sites connected</p>
              <p className="text-sm">
                Add your first WordPress site to start publishing content
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add WordPress Site
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  onTest={testConnection}
                  onUpdate={updateConnection}
                  onDelete={deleteConnection}
                  onDisconnect={disconnectConnection}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddConnectionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreate={createConnection}
      />
    </div>
  );
}

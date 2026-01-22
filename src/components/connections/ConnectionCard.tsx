import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  RefreshCw,
  Pencil,
  Trash2,
  Unplug,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { WordPressConnection } from "@/hooks/useWordPressConnections";
import { formatTimeAgo } from "@/lib/wordpressPublisher";
import { EditConnectionDialog } from "./EditConnectionDialog";

interface ConnectionCardProps {
  connection: WordPressConnection;
  onTest: (connectionId: string) => Promise<any>;
  onUpdate: (connectionId: string, data: Partial<{ name: string; base_url: string; api_key: string }>) => Promise<void>;
  onDelete: (connectionId: string) => Promise<void>;
  onDisconnect: (connectionId: string) => Promise<void>;
}

export function ConnectionCard({
  connection,
  onTest,
  onUpdate,
  onDelete,
  onDisconnect,
}: ConnectionCardProps) {
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await onTest(connection.id);
      if (result?.success) {
        toast.success("Connection test successful!");
      } else {
        toast.error(result?.error || "Connection test failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to test connection");
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(connection.id);
      toast.success("Connection deleted");
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete connection");
    } finally {
      setDeleting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await onDisconnect(connection.id);
      toast.success("Connection disconnected");
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect");
    }
  };

  const getStatusIcon = () => {
    switch (connection.status) {
      case "connected":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (connection.status) {
      case "connected":
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Connected</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon()}
                <h3 className="font-medium truncate">{connection.name}</h3>
                {getStatusBadge()}
              </div>
              
              <a
                href={connection.base_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2"
              >
                {connection.base_url}
                <ExternalLink className="h-3 w-3" />
              </a>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Last checked: {formatTimeAgo(connection.last_checked_at)}
                </span>
                {connection.last_error && (
                  <span className="text-destructive">
                    Error: {connection.last_error.substring(0, 50)}
                    {connection.last_error.length > 50 && "..."}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Test</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {connection.status === "connected" && (
                    <DropdownMenuItem onClick={handleDisconnect}>
                      <Unplug className="h-4 w-4 mr-2" />
                      Disconnect
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{connection.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditConnectionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        connection={connection}
        onUpdate={onUpdate}
      />
    </>
  );
}

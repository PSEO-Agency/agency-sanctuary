import { useParams } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Agency() {
  const { agencyId } = useParams();

  return (
    <ProtectedRoute requiredRole="agency_admin">
      <div className="min-h-screen p-6">
        <h1 className="text-3xl font-bold mb-4">Agency Portal</h1>
        <p className="text-muted-foreground">Manage your subaccounts</p>
        
        <div className="mt-8 border-2 border-dashed rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Agency dashboard coming soon...</p>
          <p className="text-xs text-muted-foreground mt-2">Agency ID: {agencyId}</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}

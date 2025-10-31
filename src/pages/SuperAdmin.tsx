import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function SuperAdmin() {
  return (
    <ProtectedRoute requiredRole="super_admin">
      <div className="min-h-screen p-6">
        <h1 className="text-3xl font-bold mb-4">Super Admin Portal</h1>
        <p className="text-muted-foreground">Manage agencies and subaccounts</p>
        
        <div className="mt-8 border-2 border-dashed rounded-lg p-12 text-center">
          <p className="text-muted-foreground">Super admin dashboard coming soon...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}

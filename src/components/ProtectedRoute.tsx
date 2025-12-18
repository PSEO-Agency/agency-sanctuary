import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "super_admin" | "agency_admin" | "sub_account_user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (requiredRole && profile?.role !== requiredRole) {
        // Super admin has access to all portals - don't redirect
        if (profile?.role === 'super_admin') {
          return;
        }
        // Redirect to appropriate portal based on role
        switch (profile?.role) {
          case "agency_admin":
            navigate(`/agency/${profile.agency_id}`);
            break;
          case "sub_account_user":
            navigate(`/subaccount/${profile.sub_account_id}/dashboard`);
            break;
          default:
            navigate("/auth");
        }
      }
    }
  }, [user, profile, loading, requiredRole, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "super_admin" | "agency_admin" | "sub_account_user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (requiredRole) {
        // Check if user has the required role from user_roles table
        const hasRequiredRole = hasRole(requiredRole);
        // Super admin has access to all portals
        const isSuperAdmin = hasRole('super_admin');
        
        if (!hasRequiredRole && !isSuperAdmin) {
          // Redirect to appropriate portal based on primary role from profile
          switch (profile?.role) {
            case "super_admin":
              navigate("/super-admin");
              break;
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
    }
  }, [user, profile, loading, requiredRole, navigate, hasRole]);

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

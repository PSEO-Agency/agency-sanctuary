import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type UserRole = "super_admin" | "agency_admin" | "subaccount_admin" | "subaccount_user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (requiredRole && userRole?.role !== requiredRole) {
        // Redirect to appropriate portal based on role
        switch (userRole?.role) {
          case "super_admin":
            navigate("/super-admin");
            break;
          case "agency_admin":
            navigate(`/agency/${userRole.agency_id}`);
            break;
          case "subaccount_admin":
          case "subaccount_user":
            navigate(`/subaccount/${userRole.subaccount_id}`);
            break;
          default:
            navigate("/auth");
        }
      }
    }
  }, [user, userRole, loading, requiredRole, navigate]);

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

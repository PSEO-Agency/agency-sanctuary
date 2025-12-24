import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type AppRole = "super_admin" | "agency_admin" | "sub_account_user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Prevent redirect loops with debouncing
  const lastRedirectRef = useRef<number>(0);
  const hasRedirectedRef = useRef(false);
  const MIN_REDIRECT_INTERVAL = 500; // ms

  useEffect(() => {
    // Don't do anything while loading
    if (loading) {
      hasRedirectedRef.current = false;
      return;
    }
    
    // Prevent rapid redirects
    const now = Date.now();
    if (now - lastRedirectRef.current < MIN_REDIRECT_INTERVAL) {
      return;
    }
    
    // Prevent duplicate redirects for the same condition
    if (hasRedirectedRef.current) {
      return;
    }

    // Redirect to auth if not logged in
    if (!user) {
      hasRedirectedRef.current = true;
      lastRedirectRef.current = now;
      navigate("/auth", { replace: true });
      return;
    }

    // Wait for profile to be loaded before checking roles
    if (!profile) {
      return;
    }

    // Check role requirements
    if (requiredRole) {
      const hasRequiredRole = hasRole(requiredRole);
      const isSuperAdmin = hasRole('super_admin');
      
      if (!hasRequiredRole && !isSuperAdmin) {
        hasRedirectedRef.current = true;
        lastRedirectRef.current = now;
        
        // Redirect to appropriate portal based on primary role from profile
        switch (profile.role) {
          case "super_admin":
            navigate("/super-admin", { replace: true });
            break;
          case "agency_admin":
            if (profile.agency_id) {
              navigate(`/agency/${profile.agency_id}`, { replace: true });
            } else {
              navigate("/onboarding", { replace: true });
            }
            break;
          case "sub_account_user":
            if (profile.sub_account_id) {
              navigate(`/subaccount/${profile.sub_account_id}/dashboard`, { replace: true });
            } else {
              navigate("/onboarding", { replace: true });
            }
            break;
          default:
            navigate("/auth", { replace: true });
        }
      }
    }
  }, [user, profile, loading, requiredRole, navigate, hasRole, location.pathname]);

  // Reset redirect flag when location changes
  useEffect(() => {
    hasRedirectedRef.current = false;
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
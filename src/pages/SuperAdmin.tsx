import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import SuperAdminDashboard from "./super-admin/Dashboard";
import CountryPartnerDashboard from "./country-partner/Dashboard";
import Agencies from "./super-admin/Agencies";
import Subaccounts from "./super-admin/Subaccounts";
import Partners from "./super-admin/Partners";
import Features from "./super-admin/Features";
import Announcements from "./super-admin/Announcements";
import SuperAdminSettings from "./super-admin/Settings";

function DashboardRouter() {
  const { hasRole } = useAuth();
  
  // Country partners get their own filtered dashboard
  const isPartnerOnly = hasRole("country_partner") && !hasRole("super_admin");
  
  if (isPartnerOnly) {
    return <CountryPartnerDashboard />;
  }
  
  return <SuperAdminDashboard />;
}

export default function SuperAdmin() {
  return (
    <ProtectedRoute requiredRole="super_admin">
      <SuperAdminLayout>
        <Routes>
          <Route path="/" element={<DashboardRouter />} />
          <Route path="/agencies" element={<Agencies />} />
          <Route path="/subaccounts" element={<Subaccounts />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/features" element={<Features />} />
          <Route path="/settings" element={<SuperAdminSettings />} />
          <Route path="*" element={<Navigate to="/super-admin" replace />} />
        </Routes>
      </SuperAdminLayout>
    </ProtectedRoute>
  );
}

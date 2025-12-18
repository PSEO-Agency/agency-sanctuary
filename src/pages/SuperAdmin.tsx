import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import SuperAdminDashboard from "./super-admin/Dashboard";
import Agencies from "./super-admin/Agencies";
import SuperAdminSettings from "./super-admin/Settings";

export default function SuperAdmin() {
  return (
    <ProtectedRoute requiredRole="super_admin">
      <SuperAdminLayout>
        <Routes>
          <Route path="/" element={<SuperAdminDashboard />} />
          <Route path="/agencies" element={<Agencies />} />
          <Route path="/settings" element={<SuperAdminSettings />} />
          <Route path="*" element={<Navigate to="/super-admin" replace />} />
        </Routes>
      </SuperAdminLayout>
    </ProtectedRoute>
  );
}

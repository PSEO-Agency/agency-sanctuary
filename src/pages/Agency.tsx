import { Routes, Route, useParams, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AgencyLayout } from "@/components/layout/AgencyLayout";
import AgencyDashboard from "./agency/Dashboard";
import Subaccounts from "./agency/Subaccounts";
import Team from "./agency/Team";
import AgencySettings from "./agency/Settings";

export default function Agency() {
  const { agencyId } = useParams();

  if (!agencyId) {
    return <Navigate to="/auth" />;
  }

  return (
    <ProtectedRoute requiredRole="agency_admin">
      <AgencyLayout agencyId={agencyId}>
        <Routes>
          <Route path="/" element={<AgencyDashboard />} />
          <Route path="/subaccounts" element={<Subaccounts />} />
          <Route path="/team" element={<Team />} />
          <Route path="/settings" element={<AgencySettings />} />
          <Route path="*" element={<Navigate to={`/agency/${agencyId}`} replace />} />
        </Routes>
      </AgencyLayout>
    </ProtectedRoute>
  );
}

import { Routes, Route, useParams, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubaccountLayout } from "@/components/layout/SubaccountLayout";
import SubaccountDashboard from "./subaccount/Dashboard";
import Campaigns from "./subaccount/Campaigns";
import Pages from "./subaccount/Pages";
import Reports from "./subaccount/Reports";
import WordPress from "./subaccount/WordPress";
import Automation from "./subaccount/Automation";
import Settings from "./subaccount/Settings";

export default function Subaccount() {
  const { subaccountId } = useParams();

  if (!subaccountId) {
    return <Navigate to="/auth" />;
  }

  return (
    <ProtectedRoute>
      <SubaccountLayout subaccountId={subaccountId}>
        <Routes>
          <Route path="dashboard" element={<SubaccountDashboard />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="pages" element={<Pages />} />
          <Route path="reports" element={<Reports />} />
          <Route path="wordpress" element={<WordPress />} />
          <Route path="automation" element={<Automation />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </SubaccountLayout>
    </ProtectedRoute>
  );
}

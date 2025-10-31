import { Routes, Route } from "react-router-dom";
import { useParams } from "react-router-dom";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import BusinessSettings from "./settings/BusinessSettings";
import ProfileSettings from "./settings/ProfileSettings";
import IntegrationSettings from "./settings/IntegrationSettings";
import BillingSettings from "./settings/BillingSettings";

export default function Settings() {
  const { subaccountId } = useParams();

  if (!subaccountId) return null;

  return (
    <div className="flex h-full">
      <SettingsSidebar subaccountId={subaccountId} />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<BusinessSettings />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/integrations" element={<IntegrationSettings />} />
          <Route path="/billing" element={<BillingSettings />} />
        </Routes>
      </main>
    </div>
  );
}

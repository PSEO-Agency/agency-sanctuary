import { Routes, Route, useParams, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubaccountLayout } from "@/components/layout/SubaccountLayout";
import { SubaccountSettingsLayout } from "@/components/layout/SubaccountSettingsLayout";
import SubaccountDashboard from "./subaccount/Dashboard";
import Campaigns from "./subaccount/Campaigns";
import Pages from "./subaccount/Pages";
import BlogProjects from "./subaccount/BlogProjects";
import Blogs from "./subaccount/Blogs";
import Reports from "./subaccount/Reports";
import WordPress from "./subaccount/WordPress";
import Launchpad from "./subaccount/Launchpad";
import KnowledgeBase from "./subaccount/KnowledgeBase";
import Settings from "./subaccount/Settings";
import ArticleEditor from "./subaccount/ArticleEditor";

export default function Subaccount() {
  const { subaccountId } = useParams();

  if (!subaccountId) {
    return <Navigate to="/auth" />;
  }

  return (
    <ProtectedRoute>
      <Routes>
        <Route path="settings/*" element={
          <SubaccountSettingsLayout subaccountId={subaccountId}>
            <Settings />
          </SubaccountSettingsLayout>
        } />
        <Route path="*" element={
          <SubaccountLayout subaccountId={subaccountId}>
            <Routes>
              <Route path="launchpad" element={<Launchpad />} />
              <Route path="wordpress" element={<WordPress />} />
              <Route path="projects" element={<BlogProjects />} />
              <Route path="projects/:projectId/blogs" element={<Blogs />} />
              <Route path="projects/:projectId/articles/:articleId" element={<ArticleEditor />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
              <Route path="dashboard" element={<SubaccountDashboard />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="pages" element={<Pages />} />
              <Route path="reports" element={<Reports />} />
              <Route path="*" element={<Navigate to="launchpad" replace />} />
            </Routes>
          </SubaccountLayout>
        } />
      </Routes>
    </ProtectedRoute>
  );
}

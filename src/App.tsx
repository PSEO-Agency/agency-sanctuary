import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Auth from "./pages/Auth";
import SuperAdmin from "./pages/SuperAdmin";
import Agency from "./pages/Agency";
import Subaccount from "./pages/Subaccount";
import BlogEditor from "./pages/subaccount/BlogEditor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <React.Fragment>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TooltipProvider>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Navigate to="/auth" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/super-admin/*" element={<SuperAdmin />} />
                <Route path="/agency/:agencyId/*" element={<Agency />} />
                <Route path="/subaccount/:subaccountId/projects/:projectId/blogs/:blogId/edit" element={<BlogEditor />} />
                <Route path="/subaccount/:subaccountId/*" element={<Subaccount />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </TooltipProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.Fragment>
  );
};

export default App;

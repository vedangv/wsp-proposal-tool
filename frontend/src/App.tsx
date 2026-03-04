import { useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ToastContext, useToastState } from "./hooks/useToast";
import ToastContainer from "./components/Toast";
import LoginPage from "./pages/LoginPage";
import ProposalsPage from "./pages/ProposalsPage";
import ProposalDetailPage from "./pages/ProposalDetailPage";
import SummaryPage from "./pages/SummaryPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import LessonsPage from "./pages/LessonsPage";
import LessonDetailPage from "./pages/LessonDetailPage";

function AppInner() {
  const toastState = useToastState();
  const addToastRef = useRef(toastState.addToast);
  addToastRef.current = toastState.addToast;

  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: { queries: { retry: 1 } },
      mutationCache: new MutationCache({
        onError: (error) => {
          const msg = error instanceof Error ? error.message : "An error occurred";
          addToastRef.current(msg, "error");
        },
      }),
    });
  }

  return (
    <ToastContext.Provider value={toastState}>
      <QueryClientProvider client={queryClientRef.current}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/proposals" element={<ProposalsPage />} />
              <Route path="/proposals/:id" element={<ProposalDetailPage />} />
              <Route path="/proposals/:id/summary" element={<SummaryPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/lessons" element={<LessonsPage />} />
              <Route path="/lessons/new" element={<LessonDetailPage />} />
              <Route path="/lessons/:id" element={<LessonDetailPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
        <ToastContainer />
      </QueryClientProvider>
    </ToastContext.Provider>
  );
}

export default function App() {
  return <AppInner />;
}

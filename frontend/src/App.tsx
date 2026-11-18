import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import AppLayout from "./components/layout/AppLayout";
import { Spinner } from "./components/ui/States";
import { useAuth } from "./context/AuthContext";
import CourseDetail from "./pages/CourseDetail";
import CourseManager from "./pages/CourseManager";
import Dashboard from "./pages/Dashboard";
import Gradebook from "./pages/Gradebook";
import Landing from "./pages/Landing";
import { Login, Register } from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Planned from "./pages/Planned";
import Settings from "./pages/Settings";
import TutorChat from "./pages/TutorChat";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/courses" replace /> : <Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/courses" element={<CourseManager />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/learning" element={<CourseManager enrolledOnly />} />
        <Route path="/gradebook" element={<Gradebook />} />
        <Route path="/tutor" element={<TutorChat />} />
        <Route path="/tutor/:id" element={<TutorChat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/generator" element={<Planned feature="AI Course Generator" phase={2} />} />
        <Route path="/flashcards" element={<Planned feature="Flashcards & Revision" phase={3} />} />
        <Route path="/documents" element={<Planned feature="Document Learning Assistant" phase={3} />} />
        <Route path="/planner" element={<Planned feature="Study Planner" phase={3} />} />
        <Route path="/analytics" element={<Planned feature="Progress Analytics" phase={2} />} />
        <Route path="/notifications" element={<Planned feature="Notifications" phase={4} />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

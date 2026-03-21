import { Routes, Route, Navigate } from "react-router-dom";
import { ConsentProvider } from "./context/ConsentContext";
import LandingPage from "./pages/LandingPage";
import ConsentPage from "./pages/ConsentPage";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AssessmentPage from "./pages/AssessmentPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ResultsPage from "./pages/ResultsPage";
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import Toast from "./components/common/Toast";

const App = () => {
  return (
    // Consent Provider
    <ConsentProvider>
      <Toast />
      {/* Browser Router - Enable Client-side Routing (navigation without page reload) */}
      {/* Routes Container - Container for all <Route> components. */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/consent" element={<ConsentPage />} />

        {/* Protected Routes - Requires Valid Consent */}
        <Route
          path="/assessment"
          element={
            <ProtectedRoute>
              <AssessmentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/:assessmentId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConsentProvider>
  );
};

export default App;

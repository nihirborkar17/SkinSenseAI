import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ConsentProvider } from './context/ConsentContext';
import LandingPage from './pages/LandingPage';
import ConsentPage from './pages/ConsentPage';
import ProtectedRoute from "./components/common/ProtectedRoute";
import AssessmentPage from "./pages/AssessmentPage";
import Toast from "./components/common/Toast";

const App = () => {
  return (
    // Consent Provider
    <ConsentProvider>
      <Toast />
      {/* Browser Router - Enable Client-side Routing (navigation without page reload) */}
      <BrowserRouter>
        {/* Routes Container - Container for all <Route> components. */}
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
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

          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConsentProvider>
  )
}

export default App

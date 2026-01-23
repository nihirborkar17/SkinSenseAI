import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ConsentProvider } from './context/ConsentContext';
import LandingPage from './pages/LandingPage';
import ConsentPage from './pages/ConsentPage';

const App = () => {
  return (
    // Consent Provider
    <ConsentProvider>
      {/* Browser Router - Enable Client-side Routing (navigation without page reload) */}
      <BrowserRouter>
        {/* Routes Container - Container for all <Route> components. */}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/consent" element={<ConsentPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConsentProvider>
  )
}

export default App

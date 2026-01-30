import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useConsent } from '../../context/ConsentContext';

interface ProtectedRouteProps {
    children : ReactNode;
}

// ProtectedRoute Component 
// Blocks access to routes that requires user consent.
const ProtectedRoute = ({ children } : ProtectedRouteProps) => {
    const { hasValidConsent } = useConsent();
    // If no valid consent, redirect to consent page
    if(!hasValidConsent) return <Navigate to={"/consent"} replace />;

    return <>{children}</>
};

export default ProtectedRoute;

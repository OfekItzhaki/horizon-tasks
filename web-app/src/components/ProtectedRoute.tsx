import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  // If not authenticated, redirect immediately (no loading state needed)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but user data is still loading, show UI with loading states
  // This allows progressive rendering - UI appears immediately, data loads in background
  return <>{children}</>;
}

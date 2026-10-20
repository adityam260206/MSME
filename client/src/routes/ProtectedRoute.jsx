import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Skeleton from '../components/feedback/Skeleton';

/**
 * Route guard that redirects unauthenticated users to the login page.
 * While the initial authentication check is happening, it shows a loading skeleton.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing } = useContext(AuthContext);
  const location = useLocation();

  if (isInitializing) {
    return (
      <div style={{ padding: 'var(--space-6)', height: '100vh', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Skeleton variant="rectangular" height="64px" />
        <Skeleton variant="rectangular" height="200px" />
        <Skeleton variant="rectangular" height="400px" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect them to the login page, but save the current location they were
    // trying to go to so we can drop them off there after they log in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

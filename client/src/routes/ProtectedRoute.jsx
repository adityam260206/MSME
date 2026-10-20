import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Skeleton from '../components/feedback/Skeleton';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isInitializing, role } = useContext(AuthContext);
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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: '8px' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Your assigned role (<strong>{role}</strong>) does not have authorization to access this business module (HTTP 403 Forbidden).
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: '10px 20px',
            background: 'var(--color-brand)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return children;
}

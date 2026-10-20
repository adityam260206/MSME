import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, KeyRound, UserCheck, Shield } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import api from '../../api/client';
import './AuthLayout.css';

export default function LoginPage() {
  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('Owner@12345');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const handleDemoSelect = (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await api.post('/auth/login', { username, password });
      const { user, access_token } = response.data.data;

      login(user, access_token);
      showToast(`Welcome back, ${user.full_name}! (${user.role})`, 'success');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMsg(error.message || 'Invalid username or password');
      showToast(error.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Card className="auth-card" padding="lg" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="auth-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
              color: '#fff',
              fontSize: '22px',
              fontWeight: 800,
              marginBottom: '12px',
              boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)',
            }}
          >
            360
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px 0' }}>
            <span style={{ color: '#4F46E5' }}>MSME</span>
            <span style={{ color: '#06B6D4' }}>360</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Integrated Business Operations & Analytics Platform
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #EF4444',
              color: '#DC2626',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Username
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. owner, manager, staff"
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            style={{ marginTop: '8px', padding: '12px', fontWeight: 700 }}
          >
            {isLoading ? 'Signing In...' : 'Sign In to MSME360'}
          </Button>
        </form>

        {/* Demo Accounts Quick-Select */}
        <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', textAlign: 'center', letterSpacing: '0.5px' }}>
            Quick Demo Role Logins
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleDemoSelect('admin', 'Admin@12345')}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: username === 'admin' ? '2px solid #EF4444' : '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '12px',
              }}
            >
              <div style={{ fontWeight: 700, color: '#EF4444' }}>ADMIN</div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>admin / Admin@12345</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('owner', 'Owner@12345')}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: username === 'owner' ? '2px solid #8B5CF6' : '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '12px',
              }}
            >
              <div style={{ fontWeight: 700, color: '#8B5CF6' }}>OWNER</div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>owner / Owner@12345</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('manager', 'Manager@12345')}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: username === 'manager' ? '2px solid #3B82F6' : '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '12px',
              }}
            >
              <div style={{ fontWeight: 700, color: '#3B82F6' }}>MANAGER</div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>manager / Manager@12345</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('staff', 'Staff@12345')}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: username === 'staff' ? '2px solid #10B981' : '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '12px',
              }}
            >
              <div style={{ fontWeight: 700, color: '#10B981' }}>STAFF</div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>staff / Staff@12345</div>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

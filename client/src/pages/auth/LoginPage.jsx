import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import { authApi } from '../../api/auth.api';
import './AuthLayout.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  
  const { login } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({});

    try {
      const response = await authApi.login({ email, password });
      const { user, token } = response.data.data;
      
      login(user, token);
      showToast(`Welcome back, ${user.name}!`, 'success');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (error.errors && error.errors.length > 0) {
        // Map field-level errors to the input state
        const errorsMap = {};
        error.errors.forEach(err => {
          errorsMap[err.field] = err.message;
        });
        setFieldErrors(errorsMap);
      } else {
        showToast(error.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Card className="auth-card" padding="lg">
        <div className="auth-header">
          <h1 className="auth-title">
            <div className="auth-brand-icon">
              <span style={{ fontSize: '26px', fontWeight: 'bold', lineHeight: 1 }}>₹</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span className="brand-text-spend" style={{ color: 'var(--color-danger)' }}>Spend</span>
              <span className="brand-text-sense" style={{ color: 'var(--color-success)' }}>Sense</span>
            </div>
          </h1>
          <p className="auth-subtitle">Sign in to manage your finances</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label="Email address"
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            placeholder="you@example.com"
            disabled={isLoading}
            required
          />

          <Input
            label="Password"
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            placeholder="••••••••"
            disabled={isLoading}
            required
          />

          <Button type="submit" fullWidth isLoading={isLoading} style={{ marginTop: '8px' }}>
            Sign In
          </Button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Create one
          </Link>
        </div>
      </Card>
    </div>
  );
}

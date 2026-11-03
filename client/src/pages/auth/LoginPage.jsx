import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import BrandMark from '../../components/layout/BrandMark';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import api from '../../api/client';
import './AuthLayout.css';

const DEMO_ROLES = [
  { role: 'Administrator', username: 'admin', password: 'Admin@12345' },
  { role: 'Owner', username: 'owner', password: 'Owner@12345' },
  { role: 'Manager', username: 'manager', password: 'Manager@12345' },
  { role: 'Counter staff', username: 'staff', password: 'Staff@12345' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('Owner@12345');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const fillDemo = (demoUsername, demoPassword) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    setErrorMsg('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await api.post('/auth/login', { username, password });
      const { user, access_token } = response.data.data;

      login(user, access_token);
      showToast(`Signed in as ${user.full_name}`, 'success');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMsg(error.message || 'That username and password do not match.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <main className="auth-card">
        <div className="auth-header">
          <div className="auth-wordmark">
            <BrandMark size={24} />
            <span className="auth-name">MSME360</span>
          </div>
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-subtitle">Counter, stock and ledger for a small business.</p>
        </div>

        {errorMsg && (
          <p className="auth-error" role="alert">
            {errorMsg}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="owner"
            autoComplete="username"
            required
            autoFocus
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            required
          />

          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
            Sign in
          </Button>
        </form>

        <div className="demo-block">
          <p className="demo-title">
            This is a demo shop. <span>Choose a role to fill the form.</span>
          </p>
          <div className="demo-grid">
            {DEMO_ROLES.map((demo) => {
              const isCurrent = username === demo.username;
              return (
                <button
                  key={demo.username}
                  type="button"
                  className={`demo-btn${isCurrent ? ' is-current' : ''}`}
                  onClick={() => fillDemo(demo.username, demo.password)}
                  aria-pressed={isCurrent}
                >
                  <strong>{demo.role}</strong>
                  <span>{demo.username}</span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <p className="auth-footer">
        Buying from this shop?{' '}
        <Link to="/portal/login" className="auth-link">
          Open the customer portal
        </Link>
      </p>
    </div>
  );
}

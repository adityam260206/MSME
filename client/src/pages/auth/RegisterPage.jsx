import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import { authApi } from '../../api/auth.api';
import './AuthLayout.css';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    currency: 'INR'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  
  const { login } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value
    }));
    // Clear error for the field being typed in
    if (fieldErrors[e.target.id]) {
      setFieldErrors(prev => ({ ...prev, [e.target.id]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({});

    try {
      const response = await authApi.register(formData);
      const { user, token } = response.data.data;
      
      login(user, token);
      showToast('Account created successfully!', 'success');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (error.errors && error.errors.length > 0) {
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
          <p className="auth-subtitle">Join SpendSense today</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            type="text"
            id="name"
            value={formData.name}
            onChange={handleChange}
            error={fieldErrors.name}
            placeholder="John Doe"
            disabled={isLoading}
            required
          />

          <Input
            label="Email address"
            type="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            placeholder="you@example.com"
            disabled={isLoading}
            required
          />

          <Input
            label="Password"
            type="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            placeholder="Min. 8 characters"
            disabled={isLoading}
            required
          />

          <Select
            label="Default Currency"
            id="currency"
            value={formData.currency}
            onChange={handleChange}
            error={fieldErrors.currency}
            disabled={isLoading}
          >
            <option value="INR">₹ (INR) - Indian Rupee</option>
            <option value="USD">$ (USD) - US Dollar</option>
            <option value="EUR">€ (EUR) - Euro</option>
            <option value="GBP">£ (GBP) - British Pound</option>
          </Select>

          <Button type="submit" fullWidth isLoading={isLoading} style={{ marginTop: '8px' }}>
            Create Account
          </Button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}

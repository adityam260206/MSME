import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Lock, Mail, Phone, User, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import api from '../../api/client';

export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (isRegister) {
        const res = await api.post('/customer-portal/register', {
          name,
          email,
          phone: phone || null,
          password
        });
        if (res.data.success) {
          const { access_token, customer } = res.data.data;
          localStorage.setItem('customer_token', access_token);
          localStorage.setItem('customer_info', JSON.stringify(customer));
          navigate('/portal');
        }
      } else {
        const res = await api.post('/customer-portal/login', {
          email,
          password
        });
        if (res.data.success) {
          const { access_token, customer } = res.data.data;
          localStorage.setItem('customer_token', access_token);
          localStorage.setItem('customer_info', JSON.stringify(customer));
          navigate('/portal');
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail('customer1@example.com');
    setPassword('Customer@123');
    setIsRegister(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(79, 70, 229, 0.15) 0%, var(--bg-root) 70%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)'
            }}
          >
            <ShoppingBag size={28} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
            MSME360 Customer Portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '6px 0 0 0' }}>
            {isRegister ? 'Create your buyer account to access order history & invoices' : 'Sign in to view your orders, invoices & submit feedback'}
          </p>
        </div>

        {/* Demo Fast Login Pill */}
        <div
          onClick={handleQuickDemo}
          style={{
            padding: '8px 14px',
            background: 'rgba(79, 70, 229, 0.08)',
            border: '1px dashed #4F46E5',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            color: 'var(--color-brand)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={15} />
            <span>Click to Autofill Verified Customer Demo Credentials</span>
          </div>
          <span style={{ fontWeight: 700 }}>Autofill</span>
        </div>

        {/* Auth Card */}
        <Card padding="lg">
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                fontSize: '12px',
                marginBottom: '16px',
                borderLeft: '3px solid #EF4444'
              }}
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isRegister && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Full Name / Business Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Email Address</label>
              <Input
                type="email"
                required
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {isRegister && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Phone Number (Optional)</label>
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Password</label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              style={{ width: '100%', marginTop: '6px', padding: '12px', fontWeight: 700 }}
            >
              {isLoading ? 'Authenticating...' : isRegister ? 'Register & Continue' : 'Sign In to Portal'}
              <ArrowRight size={16} style={{ marginLeft: '6px' }} />
            </Button>
          </form>

          {/* Toggle Register / Login */}
          <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px' }}>
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button
                  onClick={() => setIsRegister(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-brand)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                New customer?{' '}
                <button
                  onClick={() => setIsRegister(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-brand)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Create an account
                </button>
              </span>
            )}
          </div>
        </Card>

        {/* Back to Enterprise Admin */}
        <div style={{ textAlign: 'center', fontSize: '12px' }}>
          <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            ← Back to Enterprise Staff / Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}

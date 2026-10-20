import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, LogOut, CheckCircle } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../api/client';
import './Header.css';

export default function Header() {
  const { user, role, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  const fetchAlerts = async () => {
    try {
      const { data } = await api.get('/alerts?is_read=false');
      if (data.success && data.data) {
        setAlerts(data.data.slice(0, 5));
        setUnreadCount(data.data.length);
      }
    } catch {
      // Silent catch for header polling
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (alertId, e) => {
    e.stopPropagation();
    try {
      await api.post(`/alerts/${alertId}/read`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark alert as read', err);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadgeStyle = (r) => {
    switch (r) {
      case 'ADMIN':
        return { background: '#EF4444', color: '#fff' };
      case 'OWNER':
        return { background: '#8B5CF6', color: '#fff' };
      case 'MANAGER':
        return { background: '#3B82F6', color: '#fff' };
      case 'STAFF':
      default:
        return { background: '#10B981', color: '#fff' };
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Bharat Enterprises & Trading Co.
        </span>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Alerts Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="theme-toggle"
            onClick={() => setShowAlertsDropdown((v) => !v)}
            title="Stock Alerts"
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  background: '#EF4444',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showAlertsDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                width: '320px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: 'var(--space-3)',
                zIndex: 100,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Stock Alerts ({unreadCount})</span>
                <button
                  onClick={() => {
                    setShowAlertsDropdown(false);
                    navigate('/inventory');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-brand)', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                >
                  View Inventory
                </button>
              </div>

              {alerts.length === 0 ? (
                <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  No active stock alerts.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {alerts.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--radius-sm)',
                        background: a.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                        borderLeft: `3px solid ${a.severity === 'CRITICAL' ? '#EF4444' : '#F59E0B'}`,
                        fontSize: '11px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: a.severity === 'CRITICAL' ? '#DC2626' : '#D97706' }}>
                          {a.title}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{a.message}</div>
                      </div>
                      <button
                        onClick={(e) => handleMarkRead(a.id, e)}
                        title="Mark read"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}
                      >
                        <CheckCircle size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* User Profile & Role */}
        <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="avatar">{getInitials(user?.full_name || user?.username)}</div>
          <div className="user-info" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="user-name" style={{ fontWeight: 600, fontSize: '13px' }}>
                {user?.full_name || user?.username}
              </span>
              <span
                style={{
                  ...getRoleBadgeStyle(role),
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {role || 'STAFF'}
              </span>
            </div>
            <span className="user-email" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {user?.email}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#EF4444')}
          onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

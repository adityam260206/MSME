import { useContext, useState, useEffect, useRef } from 'react';
import {
  Bell,
  Moon,
  Sun,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Trash2,
  CheckCheck,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../api/client';
import './AccountBar.css';

const ROLE_TITLES = {
  ADMIN: 'Administrator',
  OWNER: 'Owner',
  MANAGER: 'Manager',
  STAFF: 'Counter staff',
};

function initials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function formatTime(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) +
      ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Who is signed in, what needs attention, and the theme switch — the foot of
 * the sidebar, where a working screen keeps its utilities.
 */
export default function AccountBar() {
  const { user, role, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const panelRef = useRef(null);

  const fetchAlerts = async () => {
    try {
      const { data } = await api.get('/alerts');
      if (data.success && Array.isArray(data.data)) setAlerts(data.data);
    } catch {
      // A quiet poll: the count simply stays as it was.
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) setIsOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', onClick);
      document.addEventListener('keydown', onKey);
    }
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const unreadCount = alerts.filter((alert) => !alert.is_read).length;
  const shown = filter === 'unread' ? alerts.filter((alert) => !alert.is_read) : alerts;

  const markRead = async (id) => {
    try {
      await api.post(`/alerts/${id}/read`);
      setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, is_read: true } : alert)));
    } catch {
      // Left unread; the next poll will show what the server holds.
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await api.post('/alerts/mark-all-read');
      setAlerts((prev) => prev.map((alert) => ({ ...alert, is_read: true })));
    } catch {
      // Leave the list as it is.
    } finally {
      setIsMarkingAll(false);
    }
  };

  const removeAlert = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    } catch {
      // Leave the row in place.
    }
  };

  const roleTitle = ROLE_TITLES[String(role || '').toUpperCase()] || 'Team member';
  const displayName = user?.full_name || user?.username || 'Signed in';

  return (
    <div className="account-bar" ref={panelRef}>
      {isOpen && (
        <div className="alerts-panel" role="dialog" aria-label="Stock alerts">
          <div className="panel-head">
            <h2 className="panel-title">Stock alerts</h2>
            {unreadCount > 0 ? (
              <button className="link-action panel-mark" onClick={markAllRead} disabled={isMarkingAll}>
                <CheckCheck size={14} aria-hidden="true" />
                Mark all read
              </button>
            ) : (
              <span className="meta">Nothing unread</span>
            )}
          </div>

          <div className="panel-tabs" role="tablist" aria-label="Alert filter">
            <button
              role="tab"
              aria-selected={filter === 'all'}
              className={`panel-tab${filter === 'all' ? ' is-current' : ''}`}
              onClick={() => setFilter('all')}
            >
              All <span className="tab-count">{alerts.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={filter === 'unread'}
              className={`panel-tab${filter === 'unread' ? ' is-current' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread <span className="tab-count">{unreadCount}</span>
            </button>
          </div>

          <div className="panel-list">
            {shown.length === 0 ? (
              <p className="panel-empty">
                {filter === 'unread'
                  ? 'Every alert has been read.'
                  : 'Stock alerts appear here when an item drops to its reorder point.'}
              </p>
            ) : (
              shown.map((alert) => (
                <div className={`alert-row${alert.is_read ? ' is-read' : ''}`} key={alert.id}>
                  <span className={`alert-glyph${alert.severity === 'CRITICAL' ? ' is-critical' : ''}`}>
                    {alert.severity === 'CRITICAL' ? (
                      <AlertTriangle size={14} aria-hidden="true" />
                    ) : (
                      <AlertCircle size={14} aria-hidden="true" />
                    )}
                  </span>
                  <div className="alert-body">
                    <p className="alert-title">{alert.title}</p>
                    <p className="alert-message">{alert.message}</p>
                    <p className="alert-time">{formatTime(alert.created_at)}</p>
                  </div>
                  <div className="alert-actions">
                    {!alert.is_read && (
                      <button
                        className="icon-btn"
                        onClick={() => markRead(alert.id)}
                        aria-label={`Mark "${alert.title}" as read`}
                        title="Mark as read"
                      >
                        <CheckCircle2 size={15} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      className="icon-btn"
                      onClick={() => removeAlert(alert.id)}
                      aria-label={`Delete "${alert.title}"`}
                      title="Delete alert"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            className="panel-foot"
            onClick={() => {
              setIsOpen(false);
              navigate('/inventory');
            }}
          >
            <span>See stock and reorder points</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="foot-row">
        <button
          className={`foot-btn${isOpen ? ' is-open' : ''}`}
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <Bell size={16} aria-hidden="true" />
          <span>Alerts</span>
          {unreadCount > 0 && <span className="count-pill">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
        <button
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
        </button>
      </div>

      <div className="foot-user">
        <span className="avatar" aria-hidden="true">{initials(displayName)}</span>
        <span className="who">
          <span className="who-name" title={displayName}>{displayName}</span>
          <span className="who-role">{roleTitle}</span>
        </span>
        <button className="icon-btn" onClick={logout} aria-label="Sign out" title="Sign out">
          <LogOut size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

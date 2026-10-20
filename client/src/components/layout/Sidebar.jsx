import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/accounts', label: 'Accounts', icon: '🏦' },
  { path: '/transactions', label: 'Transactions', icon: '💸' },
  { path: '/recurring', label: 'Recurring', icon: '⏳' },
  { path: '/goals', label: 'Goals', icon: '🎯' },
  { path: '/budgets', label: 'Budgets', icon: '📉' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
  { path: '/reports', label: 'Reports', icon: '📄' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-brand">
          <div className="brand-icon">
            <span style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: 1 }}>₹</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span className="brand-text-spend">Spend</span>
            <span className="brand-text-sense">Sense</span>
          </div>
        </h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

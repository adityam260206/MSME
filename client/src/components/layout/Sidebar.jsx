import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Landmark,
  Briefcase,
  FileBarChart,
  ShieldCheck,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { role } = useContext(AuthContext);

  const navSections = [
    {
      title: 'Operations',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'] },
        { path: '/inventory', label: 'Inventory & Catalog', icon: Package, roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'] },
        { path: '/sales', label: 'Sales / POS Counter', icon: ShoppingCart, roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'] },
        { path: '/purchases', label: 'Purchases & GRN', icon: Truck, roles: ['ADMIN', 'OWNER', 'MANAGER'] },
      ]
    },
    {
      title: 'CRM & People',
      items: [
        { path: '/customers', label: 'Customers CRM', icon: Users, roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'] },
        { path: '/employees', label: 'Workforce & HR', icon: Briefcase, roles: ['ADMIN', 'OWNER', 'MANAGER'] },
      ]
    },
    {
      title: 'Financial Intelligence',
      items: [
        { path: '/finance', label: 'Finance & Ledger', icon: Landmark, roles: ['ADMIN', 'OWNER'] },
        { path: '/reports', label: 'Reports & Exports', icon: FileBarChart, roles: ['ADMIN', 'OWNER', 'MANAGER'] },
      ]
    },
    {
      title: 'Administration',
      items: [
        { path: '/users', label: 'User Provisioning', icon: ShieldCheck, roles: ['ADMIN', 'OWNER'] },
      ]
    }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-brand">
          <div className="brand-icon" style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>360</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <div style={{ display: 'flex' }}>
              <span className="brand-text-spend" style={{ color: '#4F46E5', fontWeight: 800 }}>MSME</span>
              <span className="brand-text-sense" style={{ color: '#06B6D4', fontWeight: 800 }}>360</span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Business Suite
            </span>
          </div>
        </h2>
      </div>

      <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {navSections.map((sec, sIdx) => {
          const visibleItems = sec.items.filter((item) => !role || item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-tertiary)',
                  padding: '0 16px 4px 16px',
                }}
              >
                {sec.title}
              </div>

              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? 'nav-item-active' : ''}`
                    }
                  >
                    <span className="nav-icon">
                      <Icon size={17} />
                    </span>
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          MSME360 Enterprise v1.0
        </div>
      </div>
    </aside>
  );
}

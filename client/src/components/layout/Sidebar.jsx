import { useContext, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Building2,
  Users,
  Landmark,
  Briefcase,
  FileBarChart,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import AccountBar from './AccountBar';
import BrandMark from './BrandMark';
import './Sidebar.css';

const NAV_GROUPS = [
  {
    label: 'The shop',
    items: [
      { path: '/dashboard', label: 'Today', icon: LayoutDashboard, roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'] },
      { path: '/sales', label: 'Counter', icon: ShoppingCart, roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'] },
      { path: '/inventory', label: 'Stock', icon: Package, roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'] },
      { path: '/purchases', label: 'Purchase orders', icon: Truck, roles: ['ADMIN', 'OWNER', 'MANAGER'] },
      { path: '/suppliers', label: 'Suppliers', icon: Building2, roles: ['ADMIN', 'OWNER', 'MANAGER'] },
    ],
  },
  {
    label: 'People',
    items: [
      { path: '/customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'] },
      { path: '/employees', label: 'Staff', icon: Briefcase, roles: ['ADMIN', 'OWNER', 'MANAGER'] },
    ],
  },
  {
    label: 'Money',
    items: [
      { path: '/finance', label: 'Ledger', icon: Landmark, roles: ['ADMIN', 'OWNER'] },
      { path: '/reports', label: 'Reports', icon: FileBarChart, roles: ['ADMIN', 'OWNER', 'MANAGER'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { path: '/users', label: 'Users', icon: ShieldCheck, roles: ['ADMIN', 'OWNER'] },
    ],
  },
];

export default function Sidebar() {
  const { user, role } = useContext(AuthContext);
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const userRole = role ? String(role).toUpperCase() : null;
  const workspace = user?.tenant_name || 'Bharat Enterprises & Trading Co.';

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: userRole ? group.items.filter((item) => item.roles.includes(userRole)) : [],
  })).filter((group) => group.items.length > 0);

  const current =
    visibleGroups.flatMap((group) => group.items).find((item) => location.pathname.startsWith(item.path))
      ?.label || 'Today';

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Link to="/dashboard" className="brand" aria-label="MSME360, open Today">
          <BrandMark />
          <span className="brand-name">MSME360</span>
        </Link>
        <span className="mobile-title">{current}</span>
        <button
          className="menu-btn"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>

      <div className="sidebar-body" data-open={isOpen}>
        <div className="workspace">
          <span className="workspace-name" title={workspace}>{workspace}</span>
          <span className="workspace-scope">Small business suite</span>
        </div>

        <nav className="sidebar-nav" aria-label="Sections">
          {visibleGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => `nav-item${isActive ? ' nav-item-active' : ''}`}
                  >
                    <Icon className="nav-icon" size={16} strokeWidth={1.6} aria-hidden="true" />
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <Link to="/portal/login" className="portal-link">Open the customer portal</Link>
          <AccountBar />
        </div>
      </div>
    </aside>
  );
}

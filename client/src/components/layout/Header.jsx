import { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import Button from '../ui/Button';
import ProfileModal from './ProfileModal';
import './Header.css';

export default function Header() {
  const { user, logout, setUser } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="header">
      <div className="header-left">
        {/* Placeholder for future breadcrumbs or page title */}
      </div>

      <div className="header-right">
        <button 
          className="theme-toggle" 
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <div 
          className="user-profile" 
          onClick={() => setIsProfileModalOpen(true)}
          style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.opacity = 0.8}
          onMouseOut={(e) => e.currentTarget.style.opacity = 1}
        >
          <div className="avatar">
            {user ? getInitials(user.nickname || user.name) : '?'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.nickname || user?.name}</span>
            <span className="user-email">{user?.email}</span>
          </div>
        </div>

        <Button variant="danger" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>

      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdate={setUser}
      />
    </header>
  );
}

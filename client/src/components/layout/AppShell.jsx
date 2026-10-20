import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AICopilotDrawer from '../ai/AICopilotDrawer';
import './AppShell.css';

/**
 * The main application shell for authenticated users.
 * Contains the Sidebar, Header, and a main content area where child routes render.
 */
export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="app-content animate-fade-in">
          <Outlet />
        </main>
      </div>
      <AICopilotDrawer />
    </div>
  );
}

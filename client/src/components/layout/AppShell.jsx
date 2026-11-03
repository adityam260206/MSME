import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AICopilotDrawer from '../ai/AICopilotDrawer';
import './AppShell.css';

/**
 * The frame every working screen sits in: the product's column on the left,
 * and one canvas with equal gutters where the screen itself is built.
 */
export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <AICopilotDrawer />
    </div>
  );
}

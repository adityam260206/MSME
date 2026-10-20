import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import TransactionsPage from '../pages/transactions/TransactionsPage';
import BudgetsPage from '../pages/budgets/BudgetsPage';
import AnalyticsPage from '../pages/analytics/AnalyticsPage';
import RecurringPage from '../pages/recurring/RecurringPage';
import GoalsPage from '../pages/goals/GoalsPage';
import AccountsPage from '../pages/accounts/AccountsPage';
import ReportsPage from '../pages/reports/ReportsPage';

// Layout & Guards
import AppShell from '../components/layout/AppShell';
import ProtectedRoute from './ProtectedRoute';

export default function AppRouter() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="recurring" element={<RecurringPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

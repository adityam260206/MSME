import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import SalesPOSPage from '../pages/sales/SalesPOSPage';
import PurchasesPage from '../pages/purchases/PurchasesPage';
import CustomersPage from '../pages/customers/CustomersPage';
import FinancePage from '../pages/finance/FinancePage';
import EmployeesPage from '../pages/employees/EmployeesPage';
import ReportsPage from '../pages/reports/ReportsPage';
import UsersPage from '../pages/users/UsersPage';

// Layout & Guards
import AppShell from '../components/layout/AppShell';
import ProtectedRoute from './ProtectedRoute';

export default function AppRouter() {
  return (
    <Routes>
      {/* Public Auth Route */}
      <Route path="/login" element={<LoginPage />} />

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
        
        {/* Module 1: Dashboard */}
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* Module 2 & 3: Product Catalog, Inventory & Movements */}
        <Route path="inventory" element={<InventoryPage />} />
        
        {/* Module 5: Sales POS & Invoicing */}
        <Route path="sales" element={<SalesPOSPage />} />
        
        {/* Module 4: Suppliers, Procurement & GRN */}
        <Route
          path="purchases"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OWNER', 'MANAGER']}>
              <PurchasesPage />
            </ProtectedRoute>
          }
        />
        
        {/* Module 6: Customer CRM */}
        <Route path="customers" element={<CustomersPage />} />
        
        {/* Module 7: Financial Accounting & Ledger (Strict ADMIN/OWNER) */}
        <Route
          path="finance"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OWNER']}>
              <FinancePage />
            </ProtectedRoute>
          }
        />
        
        {/* Module 8: Workforce & HR (ADMIN/OWNER/MANAGER) */}
        <Route
          path="employees"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OWNER', 'MANAGER']}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        
        {/* Module 9: Reports & Business Intelligence */}
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OWNER', 'MANAGER']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* User Provisioning (ADMIN/OWNER) */}
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OWNER']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

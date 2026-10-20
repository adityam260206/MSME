import { useEffect, useContext, useState } from 'react';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';

import { AuthContext } from '../../context/AuthContext';
import { analyticsApi } from '../../api/analytics.api';
import { transactionsApi } from '../../api/transactions.api';
import { accountsApi } from '../../api/accounts.api';
import useApi from '../../hooks/useApi';

import StatCard from '../../components/data-display/StatCard';
import Table from '../../components/data-display/Table';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/feedback/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import FinancialHealthCard from '../../components/data-display/FinancialHealthCard';
import SpendingInsightsCard from '../../components/data-display/SpendingInsightsCard';
import SavingsGoalsWidget from '../../components/data-display/SavingsGoalsWidget';
import BudgetPredictorWidget from '../../components/data-display/BudgetPredictorWidget';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useContext(AuthContext);

  const summaryApi = useApi(analyticsApi.getSummary);
  const breakdownApi = useApi(analyticsApi.getBreakdown);
  const recentTxApi = useApi(transactionsApi.getAll);
  const healthApi = useApi(analyticsApi.getHealthScore);
  const insightsApi = useApi(analyticsApi.getInsights);
  const predictionApi = useApi(analyticsApi.getPrediction);
  const accountsApiHook = useApi(accountsApi.getAll);

  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    summaryApi.execute();
    recentTxApi.execute({ limit: 5 });
    healthApi.execute();
    insightsApi.execute();
    predictionApi.execute();
    accountsApiHook.execute();
  }, []);

  useEffect(() => {
    breakdownApi.execute(undefined, selectedAccountId || undefined);
  }, [selectedAccountId]);

  const formatCurrency = (val) => `${user?.currency || '₹'} ${val?.toFixed(2)}`;

  const columns = [
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <span style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '28px', height: '28px', borderRadius: '6px',
            backgroundColor: row.category?.color + '20' 
          }}>
            {row.category?.icon || '📦'}
          </span>
          <span>{row.category?.name || 'Uncategorized'}</span>
        </div>
      )
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => format(new Date(row.date), 'MMM dd, yyyy')
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span style={{ 
          fontWeight: 600, 
          color: row.type === 'income' ? 'var(--color-success)' : 'inherit' 
        }}>
          {row.type === 'income' ? '+' : '-'} {formatCurrency(row.amount)}
        </span>
      )
    }
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="dashboard-grid-3">
        {summaryApi.isLoading ? (
          <>
            <Skeleton variant="rectangular" height="120px" />
            <Skeleton variant="rectangular" height="120px" />
            <Skeleton variant="rectangular" height="120px" />
          </>
        ) : (
          <>
            <StatCard 
              title="Total Balance" 
              value={formatCurrency(summaryApi.data?.balance || 0)} 
              icon="💳" 
              type="brand"
            />
            <StatCard 
              title="Total Income" 
              value={formatCurrency(summaryApi.data?.totalIncome || 0)} 
              icon="📈" 
              type="success"
            />
            <StatCard 
              title="Total Expenses" 
              value={formatCurrency(summaryApi.data?.totalExpense || 0)} 
              icon="📉" 
              type="danger"
            />
          </>
        )}
      </div>

      {/* Financial Health Score — Compact Widget */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        {healthApi.isLoading ? (
          <Skeleton variant="rectangular" height="80px" />
        ) : healthApi.data ? (
          <FinancialHealthCard
            score={healthApi.data.score}
            status={healthApi.data.status}
            factors={healthApi.data.factors}
            compact={true}
          />
        ) : null}
      </div>

      <div className="dashboard-grid-layout">
        {/* Recent Transactions */}
        <div className="dashboard-main-col">
          <Card padding="lg" style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>Recent Transactions</h2>
              <Link to="/transactions" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-brand)' }}>
                View All →
              </Link>
            </div>
            
            <Table
              columns={columns}
              data={recentTxApi.data?.data}
              isLoading={recentTxApi.isLoading}
              emptyState={<EmptyState title="No recent transactions" icon="💸" />}
            />
          </Card>
        </div>

        {/* Expenses by Category Chart */}
        <div className="dashboard-side-col">
          <Card padding="lg" style={{ height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>Where your money went</h2>
              </div>
              
              {/* Account Selection Tabs */}
              <div style={{ 
                display: 'flex', 
                gap: 'var(--space-2)', 
                overflowX: 'auto', 
                paddingBottom: '4px',
                scrollbarWidth: 'none' /* Firefox */ 
              }} className="hide-scrollbar">
                <Button 
                  variant={selectedAccountId === '' ? 'primary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setSelectedAccountId('')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  All Accounts
                </Button>
                {accountsApiHook.data?.data?.map(acc => (
                  <Button 
                    key={acc._id} 
                    variant={selectedAccountId === acc._id ? 'primary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setSelectedAccountId(acc._id)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {acc.name}
                  </Button>
                ))}
              </div>
            </div>
            
            {breakdownApi.isLoading ? (
              <Skeleton variant="rectangular" height="300px" />
            ) : breakdownApi.data?.breakdown?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={breakdownApi.data.breakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={100}
                        paddingAngle={5}
                      >
                        {breakdownApi.data.breakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend */}
                <div className="chart-legend" style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '8px' }}>
                  {breakdownApi.data.breakdown.map(item => (
                    <div key={item.categoryId} className="legend-item" style={{ marginBottom: '8px' }}>
                      <span className="legend-color" style={{ backgroundColor: item.color }} />
                      <span className="legend-name text-truncate">{item.name}</span>
                      <span className="legend-value">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="No expenses this month" icon="📊" />
            )}
          </Card>
        </div>
      </div>

      {/* Spending Insights — Compact Widget */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        {insightsApi.isLoading ? (
          <Skeleton variant="rectangular" height="120px" />
        ) : insightsApi.data?.insights?.length > 0 ? (
          <SpendingInsightsCard
            insights={insightsApi.data.insights}
            compact={true}
          />
        ) : null}
      </div>

      <div className="dashboard-grid-layout" style={{ marginTop: 'var(--space-6)' }}>
        <div className="dashboard-main-col">
          {/* Budget Predictor */}
          <BudgetPredictorWidget 
            prediction={predictionApi.data} 
            isLoading={predictionApi.isLoading} 
          />
        </div>
        <div className="dashboard-side-col">
          {/* Savings Goals — Compact Widget */}
          <SavingsGoalsWidget />
        </div>
      </div>
    </div>
  );
}

import { useEffect, useContext, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { analyticsApi } from '../../api/analytics.api';
import useApi from '../../hooks/useApi';
import { AuthContext } from '../../context/AuthContext';

import Card from '../../components/ui/Card';
import StatCard from '../../components/data-display/StatCard';
import Skeleton from '../../components/feedback/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import FinancialHealthCard from '../../components/data-display/FinancialHealthCard';
import SpendingInsightsCard from '../../components/data-display/SpendingInsightsCard';
import './AnalyticsPage.css';

export default function AnalyticsPage() {
  const { user } = useContext(AuthContext);
  
  const [currentPeriod, setCurrentPeriod] = useState(
    new Date().toISOString().substring(0, 7)
  );

  const summaryApi = useApi(analyticsApi.getSummary);
  const trendApi = useApi(analyticsApi.getTrend);
  const healthApi = useApi(analyticsApi.getHealthScore);
  const insightsApi = useApi(analyticsApi.getInsights);

  useEffect(() => {
    summaryApi.execute(currentPeriod);
  }, [currentPeriod]);

  useEffect(() => {
    trendApi.execute();
    healthApi.execute();
    insightsApi.execute();
  }, []);

  const formatCurrency = (val) => `${user?.currency || '₹'} ${val?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Understand your financial habits</p>
        </div>
        <input 
          type="month" 
          className="period-selector"
          value={currentPeriod}
          onChange={(e) => setCurrentPeriod(e.target.value)}
        />
      </div>

      {/* Snapshot for the selected month */}
      <div className="analytics-snapshot">
        {summaryApi.isLoading ? (
          <>
            <Skeleton variant="rectangular" height="120px" />
            <Skeleton variant="rectangular" height="120px" />
          </>
        ) : (
          <>
            <StatCard 
              title="Savings Rate" 
              value={`${summaryApi.data?.savingsRate || 0}%`} 
              icon="💰" 
              type={summaryApi.data?.savingsRate >= 20 ? 'success' : 'neutral'}
            />
            <StatCard 
              title="Net Cash Flow" 
              value={formatCurrency(summaryApi.data?.balance || 0)} 
              icon="⚖️" 
              type={summaryApi.data?.balance >= 0 ? 'success' : 'danger'}
            />
          </>
        )}
      </div>

      {/* Financial Health Score */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        {healthApi.isLoading ? (
          <Skeleton variant="rectangular" height="280px" />
        ) : healthApi.data ? (
          <FinancialHealthCard
            score={healthApi.data.score}
            status={healthApi.data.status}
            factors={healthApi.data.factors}
            compact={false}
          />
        ) : null}
      </div>

      {/* 6 Month Trend Chart */}
      <Card padding="lg" style={{ marginTop: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', margin: '0 0 var(--space-6) 0' }}>6-Month Cash Flow Trend</h2>
        
        {trendApi.isLoading ? (
          <Skeleton variant="rectangular" height="350px" />
        ) : trendApi.data?.trend?.length > 0 ? (
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trendApi.data.trend}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  tickFormatter={(val) => `${val > 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                />
                <RechartsTooltip 
                  cursor={{ fill: 'var(--bg-surface-active)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)', backgroundColor: 'var(--bg-surface)' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                
                <Bar 
                  dataKey="income" 
                  name="Income" 
                  fill="var(--color-success)" 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                />
                <Bar 
                  dataKey="expense" 
                  name="Expenses" 
                  fill="var(--color-danger)" 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="Not enough data" description="Keep logging transactions to see your trends." icon="📉" />
        )}
      </Card>

      {/* Spending Insights */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        {insightsApi.isLoading ? (
          <Skeleton variant="rectangular" height="200px" />
        ) : insightsApi.data?.insights?.length > 0 ? (
          <SpendingInsightsCard
            insights={insightsApi.data.insights}
            compact={false}
          />
        ) : null}
      </div>
    </div>
  );
}

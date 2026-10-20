import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  PlusCircle,
  Truck,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AuthContext } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/feedback/Skeleton';
import api from '../../api/client';
import './DashboardPage.css';

export default function DashboardPage() {
  const { role, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summaryRes = await api.get('/dashboard/summary');
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }

      // If authorized for analytics, fetch trends
      if (role !== 'STAFF') {
        const trendsRes = await api.get('/analytics/sales');
        if (trendsRes.data.success) {
          setTrends(trendsRes.data.data.trends || []);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Error loading dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  if (isLoading) {
    return (
      <div className="dashboard-page" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
          <Skeleton variant="rectangular" height="120px" />
        </div>
        <Skeleton variant="rectangular" height="320px" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>{error}</p>
        <Button onClick={loadData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="dashboard-page" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>
            Welcome back, {user?.full_name || user?.username}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Store Operations Overview & Live Telemetry ({role} view)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="primary" onClick={() => navigate('/sales')}>
            <ShoppingCart size={16} style={{ marginRight: '6px' }} />
            New POS Sale
          </Button>
          {role !== 'STAFF' && (
            <Button variant="secondary" onClick={() => navigate('/purchases')}>
              <Truck size={16} style={{ marginRight: '6px' }} />
              Procurement
            </Button>
          )}
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        {/* Card 1: Today's Revenue (Role filtered) */}
        {role !== 'STAFF' ? (
          <Card padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Today's Sales Revenue
                </span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>
                  ₹{Number(summary?.today_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                <TrendingUp size={20} />
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Completed realized orders today
            </div>
          </Card>
        ) : (
          <Card padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Store POS Terminal
                </span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#3B82F6', marginTop: '6px' }}>
                  Active Counter
                </div>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                <ShoppingCart size={20} />
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Ready for customer checkout
            </div>
          </Card>
        )}

        {/* Card 2: Monthly Sales Volume */}
        <Card padding="md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Monthly Order Volume
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px' }}>
                {summary?.monthly_sales_volume || 0} <span style={{ fontSize: '14px', fontWeight: 500 }}>orders</span>
              </div>
            </div>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
              <ShoppingCart size={20} />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            This calendar month
          </div>
        </Card>

        {/* Card 3: Low & Out of Stock Alerts */}
        <Card padding="md" onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Stock Threshold Alerts
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: (summary?.low_stock_count || 0) + (summary?.out_of_stock_count || 0) > 0 ? '#EF4444' : '#10B981', marginTop: '6px' }}>
                {(summary?.low_stock_count || 0) + (summary?.out_of_stock_count || 0)}
              </div>
            </div>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            {summary?.out_of_stock_count || 0} out of stock, {summary?.low_stock_count || 0} low stock
          </div>
        </Card>

        {/* Card 4: Gross Margin (ADMIN & OWNER only) */}
        {['ADMIN', 'OWNER'].includes(role) ? (
          <Card padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Gross Profit Margin
                </span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#8B5CF6', marginTop: '6px' }}>
                  {summary?.gross_profit_margin || '0.00'}%
                </div>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}>
                <DollarSign size={20} />
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Net Gross: ₹{Number(summary?.gross_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </Card>
        ) : (
          <Card padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Total Catalog SKUs
                </span>
                <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px' }}>
                  {summary?.total_products || 0}
                </div>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', color: '#06B6D4' }}>
                <Package size={20} />
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Active catalog items
            </div>
          </Card>
        )}
      </div>

      {/* Analytics Chart & Top Products */}
      <div style={{ display: 'grid', gridTemplateColumns: role !== 'STAFF' ? '2fr 1fr' : '1fr', gap: 'var(--space-6)' }}>
        {/* Trend Chart (Role: ADMIN, OWNER, MANAGER) */}
        {role !== 'STAFF' && (
          <Card padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                30-Day Realized Daily Sales Velocity
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Completed Orders</span>
            </div>
            <div style={{ height: '260px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} stroke="var(--text-secondary)" />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} stroke="var(--text-secondary)" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="sales_count" name="Sales Count" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Top Products Table */}
        <Card padding="md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Top Selling Products</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>This Month</span>
          </div>

          {summary?.top_products?.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No completed sales this month.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {summary?.top_products?.map((item) => (
                <div
                  key={item.product_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-hover)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.product_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      SKU: {item.sku} • In Stock: {item.stock_quantity}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-brand)' }}>
                      {item.units_sold} sold
                    </div>
                    {item.revenue !== null && item.revenue !== undefined && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        ₹{Number(item.revenue).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

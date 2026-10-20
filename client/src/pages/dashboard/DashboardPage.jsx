import React, { useState, useEffect, useContext } from 'react';
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
  Target,
  Sparkles,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight
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
  const [selectedRange, setSelectedRange] = useState('30d'); // 7d, 30d, 90d
  const [goalsProgress, setGoalsProgress] = useState(null);
  const [actionItems, setActionItems] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Goal config modal state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalRevenueInput, setGoalRevenueInput] = useState('');
  const [goalVolumeInput, setGoalVolumeInput] = useState('');
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Dashboard summary
      const summaryRes = await api.get('/dashboard/summary');
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }

      // 2. Trends if authorized
      if (role !== 'STAFF') {
        const trendsRes = await api.get('/analytics/sales');
        if (trendsRes.data.success) {
          setTrends(trendsRes.data.data.trends || []);
        }
      }

      // 3. Business Goals
      try {
        const goalsRes = await api.get('/dashboard/goals');
        if (goalsRes.data.success) {
          setGoalsProgress(goalsRes.data.data);
          setGoalRevenueInput(String(goalsRes.data.data.target_revenue || '50000'));
          setGoalVolumeInput(String(goalsRes.data.data.target_sales_volume || '25'));
        }
      } catch (e) {
        // Fallback if goals table empty
      }

      // 4. Action Center
      if (role !== 'STAFF') {
        try {
          const actionRes = await api.get('/analytics/action-center');
          if (actionRes.data.success) {
            setActionItems(actionRes.data.data.actions || []);
          }
        } catch (e) {}
      }

      // 5. Anomalies
      if (role !== 'STAFF') {
        try {
          const anomalyRes = await api.get('/analytics/anomalies');
          if (anomalyRes.data.success) {
            setAnomalies(anomalyRes.data.data.anomalies || []);
          }
        } catch (e) {}
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

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    setIsSavingGoal(true);
    try {
      const nowMonth = new Date().toISOString().slice(0, 7);
      await api.post('/dashboard/goals', {
        target_month: nowMonth,
        target_revenue: Number(goalRevenueInput),
        target_sales_volume: Number(goalVolumeInput),
        notes: "Configured via Dashboard"
      });
      setIsGoalModalOpen(false);
      // Reload goals
      const goalsRes = await api.get('/dashboard/goals');
      if (goalsRes.data.success) {
        setGoalsProgress(goalsRes.data.data);
      }
    } catch (err) {
      alert("Failed to save goal: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSavingGoal(false);
    }
  };

  // Filter trends based on selected range
  const filteredTrends = React.useMemo(() => {
    if (!trends || trends.length === 0) return [];
    if (selectedRange === '7d') return trends.slice(-7);
    if (selectedRange === '90d') return trends;
    return trends.slice(-30);
  }, [trends, selectedRange]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>
              Welcome back, {user?.full_name || user?.username}!
            </h1>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(108, 92, 231, 0.1)',
                color: 'var(--color-brand)',
                fontWeight: 700,
              }}
            >
              {role} ACCESS
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Operations Command Center & Real-time Telemetry
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => navigate('/sales')}>
            <ShoppingCart size={16} style={{ marginRight: '6px' }} />
            POS Terminal
          </Button>

          {role !== 'STAFF' && (
            <Button variant="secondary" onClick={() => navigate('/purchases')}>
              <Truck size={16} style={{ marginRight: '6px' }} />
              Procurement (PO)
            </Button>
          )}

          {['ADMIN', 'OWNER'].includes(role) && (
            <Button variant="secondary" onClick={() => navigate('/finance')}>
              <DollarSign size={16} style={{ marginRight: '6px' }} />
              Cash Flow & Ledger
            </Button>
          )}
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        {/* Card 1: Today's Revenue */}
        {role !== 'STAFF' ? (
          <Card padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Today's Realized Sales
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
              From completed customer sales
            </div>
          </Card>
        ) : (
          <Card padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Active POS Counter
                </span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#3B82F6', marginTop: '6px' }}>
                  Ready to Bill
                </div>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                <ShoppingCart size={20} />
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Staff counter ready for checkout
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
            Realized this calendar month
          </div>
        </Card>

        {/* Card 3: Stock Threshold Alerts */}
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
            {summary?.out_of_stock_count || 0} stockout, {summary?.low_stock_count || 0} low stock
          </div>
        </Card>

        {/* Card 4: Role-Based Card (Gross Profit or Inventory Total) */}
        {['ADMIN', 'OWNER'].includes(role) ? (
          <Card padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Month Gross Margin
                </span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: Number(summary?.gross_profit || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '6px' }}>
                  {summary?.gross_profit_margin || '0.00'}%
                </div>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                <DollarSign size={20} />
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Profit: ₹{Number(summary?.gross_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </Card>
        ) : (
          <Card padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Active Catalog SKUs
                </span>
                <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px' }}>
                  {summary?.total_products || 0}
                </div>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                <Package size={20} />
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Available in catalog system
            </div>
          </Card>
        )}
      </div>

      {/* Business Goals & Action Center Row */}
      {role !== 'STAFF' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-6)' }}>
          {/* Business Goals Progress Card */}
          <Card padding="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} style={{ color: 'var(--color-brand)' }} />
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>
                  Monthly Business Performance Target
                </h3>
              </div>
              {['ADMIN', 'OWNER'].includes(role) && (
                <button
                  onClick={() => setIsGoalModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-brand)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Configure Target
                </button>
              )}
            </div>

            {goalsProgress ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Revenue Target Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Revenue Target ({goalsProgress.target_month})</span>
                    <span style={{ fontWeight: 600 }}>
                      ₹{Number(goalsProgress.actual_revenue || 0).toLocaleString('en-IN')} / ₹{Number(goalsProgress.target_revenue || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-root)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Number(goalsProgress.revenue_achievement_rate || 0))}%`,
                        height: '100%',
                        backgroundColor: Number(goalsProgress.revenue_achievement_rate || 0) >= 100 ? '#10B981' : 'var(--color-brand)',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>{goalsProgress.revenue_achievement_rate}% Achieved</span>
                    {Number(goalsProgress.remaining_revenue_deficit) > 0 ? (
                      <span style={{ color: '#EF4444' }}>Deficit: ₹{Number(goalsProgress.remaining_revenue_deficit).toLocaleString('en-IN')}</span>
                    ) : (
                      <span style={{ color: '#10B981' }}>Target Met!</span>
                    )}
                  </div>
                </div>

                {/* Sales Volume Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Sales Volume Target</span>
                    <span style={{ fontWeight: 600 }}>
                      {goalsProgress.actual_sales_volume} / {goalsProgress.target_sales_volume} orders
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-root)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Number(goalsProgress.volume_achievement_rate || 0))}%`,
                        height: '100%',
                        backgroundColor: '#3B82F6',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {goalsProgress.volume_achievement_rate}% Achieved
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '16px 0', textAlign: 'center' }}>
                No monthly targets configured yet. Click above to set this month's revenue and sales volume goals.
              </div>
            )}
          </Card>

          {/* Business Action Center Card */}
          <Card padding="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} style={{ color: '#10B981' }} />
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>
                  Business Action Center
                </h3>
              </div>
              <Badge variant={actionItems.length > 0 ? 'warning' : 'success'}>
                {actionItems.length} Pending Actions
              </Badge>
            </div>

            {actionItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <CheckCircle2 size={32} style={{ color: '#10B981', margin: '0 auto 8px auto', display: 'block' }} />
                All operational metrics are currently optimal. No urgent actions pending!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {actionItems.map(act => (
                  <div
                    key={act.id}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-root)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {act.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {act.description}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(act.navigation_path)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-brand)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>{act.action_label}</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Main Charts & Analytics Row */}
      {role !== 'STAFF' && (
        <Card padding="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: 'var(--space-4)' }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>
                Sales & Revenue Trajectory
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0 0' }}>
                Deterministic rolling volume from realized POS transactions
              </p>
            </div>

            {/* Time Window Selector */}
            <div style={{ display: 'flex', backgroundColor: 'var(--bg-root)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
              {['7d', '30d', '90d'].map(range => (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: selectedRange === range ? 'var(--bg-surface)' : 'transparent',
                    color: selectedRange === range ? 'var(--color-brand)' : 'var(--text-secondary)',
                    fontWeight: selectedRange === range ? 600 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: selectedRange === range ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: '280px', width: '100%' }}>
            {filteredTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="sales_count" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" name="Orders" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No sales records found in selected interval
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Top Products & Anomaly Detection Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-6)' }}>
        {/* Top Products */}
        <Card padding="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>
              Top Moving Products (30 Days)
            </h3>
            <button
              onClick={() => navigate('/inventory')}
              style={{ background: 'none', border: 'none', color: 'var(--color-brand)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Full Catalog &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {summary?.top_products && summary.top_products.length > 0 ? (
              summary.top_products.map((p, idx) => (
                <div
                  key={p.product_id || idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-root)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.product_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>SKU: {p.sku} | In Stock: {p.stock_quantity}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-brand)', fontSize: '13px' }}>{p.units_sold} units</div>
                    {p.revenue && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        ₹{Number(p.revenue).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                No product movements recorded in this period.
              </div>
            )}
          </div>
        </Card>

        {/* Business Health & Anomaly Feed (USP 4.2) */}
        {role !== 'STAFF' && (
          <Card padding="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--color-brand)' }} />
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>
                  Business Health & Anomaly Feed
                </h3>
              </div>
              <Badge variant="secondary">Rule-based Telemetry</Badge>
            </div>

            {anomalies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <CheckCircle2 size={32} style={{ color: '#10B981', margin: '0 auto 8px auto', display: 'block' }} />
                No statistical anomalies detected. Store operations running within standard baselines.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                {anomalies.map(ano => (
                  <div
                    key={ano.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: `4px solid ${ano.severity === 'HIGH' ? '#EF4444' : '#FFB800'}`,
                      backgroundColor: 'var(--bg-root)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', color: ano.severity === 'HIGH' ? '#EF4444' : '#D97706' }}>
                        {ano.condition}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{ano.category}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '4px' }}>
                      <strong>{ano.affected_entity}</strong>: {ano.observed_value}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      <em>Action:</em> {ano.suggested_action}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Goal Configuration Modal */}
      {isGoalModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 48px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 16px 0' }}>
              Set Monthly Performance Target
            </h3>

            <form onSubmit={handleSaveGoal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Target Revenue (INR)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={goalRevenueInput}
                  onChange={e => setGoalRevenueInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-root)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Target Order Volume (Units)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={goalVolumeInput}
                  onChange={e => setGoalVolumeInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-root)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <Button type="button" variant="secondary" onClick={() => setIsGoalModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSavingGoal}>
                  {isSavingGoal ? 'Saving...' : 'Save Target'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

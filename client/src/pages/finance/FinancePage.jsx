import React, { useState, useEffect, useContext } from 'react';
import {
  Landmark,
  Plus,
  Lock,
  Clock,
  PieChart,
  ShieldCheck,
  Award
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';
import CreditRiskTab from './CreditRiskTab';
import SchemeEligibilityTab from './SchemeEligibilityTab';

export default function FinancePage() {
  const { role } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  // Tab navigation: 'ledger' | 'cashflow' | 'profitability' | 'credit-risk' | 'schemes'
  const [activeTab, setActiveTab] = useState('ledger');

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [profitabilityData, setProfitabilityData] = useState(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination for Ledger
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Manual Transaction Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    type: 'EXPENSE',
    category: 'UTILITIES',
    amount: '',
    description: '',
  });

  const isAuthorized = ['ADMIN', 'OWNER'].includes(role);

  const loadLedgerData = async () => {
    if (!isAuthorized) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('page', page);
      params.append('limit', 20);

      const [sumRes, txRes] = await Promise.all([
        api.get('/finance/summary'),
        api.get(`/finance/transactions?${params.toString()}`),
      ]);

      if (sumRes.data.success) setSummary(sumRes.data.data);
      if (txRes.data.success) {
        setTransactions(txRes.data.data || []);
        if (txRes.data.meta) setTotalPages(txRes.data.meta.total_pages);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load financial ledger', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCashFlowData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/analytics/cash-flow-projection');
      if (res.data.success) {
        setCashFlowData(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load cash flow projection', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfitabilityData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/analytics/profitability');
      if (res.data.success) {
        setProfitabilityData(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load product profitability', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ledger') {
      loadLedgerData();
    } else if (activeTab === 'cashflow') {
      loadCashFlowData();
    } else if (activeTab === 'profitability') {
      loadProfitabilityData();
    }
  }, [typeFilter, categoryFilter, startDate, endDate, page, activeTab]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!txForm.amount || parseFloat(txForm.amount) <= 0) {
      showToast('Please enter a valid positive amount', 'error');
      return;
    }

    try {
      await api.post('/finance/transactions', {
        type: txForm.type,
        category: txForm.category,
        amount: parseFloat(txForm.amount),
        description: txForm.description || 'Manual operating expense',
        payment_method: 'CASH',
      });
      showToast('Expense recorded successfully', 'success');
      setIsModalOpen(false);
      setTxForm({ type: 'EXPENSE', category: 'UTILITIES', amount: '', description: '' });
      loadLedgerData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredProfitProducts = React.useMemo(() => {
    if (!profitabilityData?.products) return [];
    if (!selectedQuadrant) return profitabilityData.products;
    return profitabilityData.products.filter(p => p.quadrant === selectedQuadrant);
  }, [profitabilityData, selectedQuadrant]);

  // If unauthorized (e.g. MANAGER or STAFF)
  if (!isAuthorized) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', maxWidth: '520px', margin: '40px auto' }}>
        <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0' }}>Financial Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
          The complete financial ledger, gross margin analysis, net profit calculations, and cash flow projections are restricted strictly to <strong>Business Owners</strong> and <strong>Administrators</strong>.
        </p>
        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          HTTP 403 Forbidden enforced at API boundary.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>Financial Accounting & Intelligence</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Authoritative Cash Flow, Profit & Loss Reconciliation, and Predictive Liquidity ({role} Access)
          </p>
        </div>

        {activeTab === 'ledger' && (
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            Record Operating Expense
          </Button>
        )}
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('ledger')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: activeTab === 'ledger' ? 'var(--color-brand)' : 'transparent',
            color: activeTab === 'ledger' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Landmark size={16} />
          <span>General Ledger & Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('cashflow')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: activeTab === 'cashflow' ? 'var(--color-brand)' : 'transparent',
            color: activeTab === 'cashflow' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Clock size={16} />
          <span>Forward Cash Flow Visibility</span>
        </button>

        <button
          onClick={() => setActiveTab('profitability')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: activeTab === 'profitability' ? 'var(--color-brand)' : 'transparent',
            color: activeTab === 'profitability' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <PieChart size={16} />
          <span>Product Profitability Intelligence</span>
        </button>

        <button
          onClick={() => setActiveTab('credit-risk')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: activeTab === 'credit-risk' ? 'var(--color-brand)' : 'transparent',
            color: activeTab === 'credit-risk' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ShieldCheck size={16} />
          <span>Enterprise Credit & Risk Scoring</span>
        </button>

        <button
          onClick={() => setActiveTab('schemes')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: activeTab === 'schemes' ? 'var(--color-brand)' : 'transparent',
            color: activeTab === 'schemes' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Award size={16} />
          <span>Govt & Bank Scheme Eligibility</span>
        </button>
      </div>

      {/* TAB 1: GENERAL LEDGER & SUMMARY */}
      {activeTab === 'ledger' && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <Card padding="md">
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Realized Revenue</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>
                ₹{Number(summary?.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>From completed sales</div>
            </Card>

            <Card padding="md">
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Procurement Expenses</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#F59E0B', marginTop: '6px' }}>
                ₹{Number(summary?.purchases_expense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Cost of Goods Received</div>
            </Card>

            <Card padding="md">
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Expenses (All)</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444', marginTop: '6px' }}>
                ₹{Number(summary?.total_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Purchases + Overheads</div>
            </Card>

            <Card padding="md">
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Net Operating Profit</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: Number(summary?.net_profit || 0) >= 0 ? '#8B5CF6' : '#EF4444', marginTop: '6px' }}>
                ₹{Number(summary?.net_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Margin: <strong>{summary?.profit_margin_percent || '0.00'}%</strong>
              </div>
            </Card>
          </div>

          {/* Receivables Aging Breakdown */}
          <Card padding="md">
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0' }}>Receivables Aging Buckets (Non-overlapping)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <div style={{ background: 'var(--bg-surface-hover)', padding: '10px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #10B981' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>0–30 Days (Current)</div>
                <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                  ₹{Number(summary?.receivables_aging?.['0-30'] || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-hover)', padding: '10px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #F59E0B' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>31–60 Days</div>
                <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                  ₹{Number(summary?.receivables_aging?.['31-60'] || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-hover)', padding: '10px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #EF4444' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>61–90 Days</div>
                <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                  ₹{Number(summary?.receivables_aging?.['61-90'] || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-hover)', padding: '10px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #7F1D1D' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>91+ Days (Critical)</div>
                <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                  ₹{Number(summary?.receivables_aging?.['91+'] || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </Card>

          {/* Filter Bar */}
          <Card padding="md">
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '13px' }}
              >
                <option value="">All Types (Income & Expense)</option>
                <option value="INCOME">Income Only</option>
                <option value="EXPENSE">Expense Only</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '13px' }}
              >
                <option value="">All Categories</option>
                <option value="SALES">Sales Income</option>
                <option value="PURCHASES">Procurement Expense</option>
                <option value="UTILITIES">Utilities / Rent</option>
                <option value="SALARY">Payroll / Wages</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="OTHER">Other Expenses</option>
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '13px' }}
              />

              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '13px' }}
              />
            </div>
          </Card>

          {/* Ledger Table */}
          <Card padding="none">
            {isLoading ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading financial records...
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No financial transactions found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date & Reference</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category & Description</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Method</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{new Date(tx.created_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {tx.reference_id || tx.id.slice(0, 8)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 600 }}>{tx.category}</span>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tx.description || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: tx.type === 'INCOME' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: tx.type === 'INCOME' ? '#10B981' : '#EF4444',
                            }}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {tx.payment_method}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: tx.type === 'INCOME' ? '#10B981' : '#EF4444' }}>
                          {tx.type === 'INCOME' ? `+₹${parseFloat(tx.amount).toFixed(2)}` : `-₹${parseFloat(tx.amount).toFixed(2)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* TAB 2: FORWARD CASH FLOW VISIBILITY (USP 4.6) */}
      {activeTab === 'cashflow' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Summary Liquidity Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            <Card padding="md">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Current Liquid Balance
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: 'var(--color-brand)' }}>
                ₹{Number(cashFlowData?.current_cash_position || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Realized ledger cash position</div>
            </Card>

            <Card padding="md">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Projected Inflows (30 Days)
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>
                +₹{Number(cashFlowData?.projected_inflows_30d || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>From pending customer invoices</div>
            </Card>

            <Card padding="md">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Projected Outflows (30 Days)
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#EF4444', marginTop: '6px' }}>
                -₹{Number(cashFlowData?.projected_outflows_30d || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Committed POs + estimated overhead</div>
            </Card>

            <Card padding="md">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Projected Net Position (30D)
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: Number(cashFlowData?.projected_net_30d || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '6px' }}>
                ₹{Number(cashFlowData?.projected_net_30d || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Current + Inflows - Outflows</div>
            </Card>
          </div>

          {/* Projection Schedule Table */}
          <Card padding="none">
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>30-Day Liquidity Projection Schedule</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Itemized schedule of pending receivables and committed procurement payables
              </p>
            </div>

            {isLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading schedule...</div>
            ) : !cashFlowData?.schedule || cashFlowData.schedule.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No scheduled inflows or outflows found.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Due Date</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Source Type</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Entity & Reference</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status Note</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Projected Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlowData.schedule.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                          {item.date_or_bucket}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: item.is_inflow ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: item.is_inflow ? '#10B981' : '#EF4444',
                            }}
                          >
                            {item.source_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {item.entity_name}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {item.status}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: item.is_inflow ? '#10B981' : '#EF4444' }}>
                          {item.is_inflow ? `+₹${Number(item.amount).toLocaleString('en-IN')}` : `-₹${Number(item.amount).toLocaleString('en-IN')}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Assumptions Box */}
            {cashFlowData?.assumptions && (
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-root)', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong>Accounting Assumptions:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {cashFlowData.assumptions.map((ass, i) => (
                    <li key={i}>{ass}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: PRODUCT PROFITABILITY INTELLIGENCE (USP 4.3) */}
      {activeTab === 'profitability' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <Card padding="md">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Sales Revenue
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>
                ₹{Number(profitabilityData?.total_sales_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </Card>

            <Card padding="md">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Estimated Cost of Goods (COGS)
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#F59E0B', marginTop: '6px' }}>
                ₹{Number(profitabilityData?.total_estimated_cogs || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </Card>

            <Card padding="md">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Overall Gross Profit
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#8B5CF6', marginTop: '6px' }}>
                ₹{Number(profitabilityData?.overall_gross_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </Card>

            <Card padding="md">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Overall Gross Margin
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>
                {profitabilityData?.overall_gross_margin_percent || '0.00'}%
              </div>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card padding="md">
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter by Quadrant:</span>
              <select
                value={selectedQuadrant}
                onChange={e => setSelectedQuadrant(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '12px' }}
              >
                <option value="">All Quadrants</option>
                <option value="STAR">Star (High Volume, High Margin)</option>
                <option value="CASH_COW">Cash Cow (High Volume, Lower Margin)</option>
                <option value="OPPORTUNITY">Opportunity (Low Volume, High Margin)</option>
                <option value="UNDERPERFORMER">Underperformer (Low Volume, Low Margin)</option>
              </select>
            </div>
          </Card>

          {/* Product Profitability Table */}
          <Card padding="none">
            {isLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Analyzing product margins...</div>
            ) : filteredProfitProducts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No product profitability data available.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>SKU & Name</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Units Sold</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Revenue</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>COGS</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Gross Profit</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Margin %</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfitProducts.map((p) => (
                      <tr key={p.product_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{p.product_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{p.sku}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{p.category_name}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.units_sold}</td>
                        <td style={{ padding: '12px 16px', color: '#10B981', fontWeight: 600 }}>₹{Number(p.total_revenue).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', color: '#EF4444' }}>₹{Number(p.total_estimated_cost).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: Number(p.gross_profit) >= 0 ? '#10B981' : '#EF4444' }}>
                          ₹{Number(p.gross_profit).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                          {p.gross_margin_percent}%
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor:
                                p.quadrant === 'STAR' ? 'rgba(16, 185, 129, 0.15)' :
                                p.quadrant === 'CASH_COW' ? 'rgba(59, 130, 246, 0.15)' :
                                p.quadrant === 'OPPORTUNITY' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color:
                                p.quadrant === 'STAR' ? '#10B981' :
                                p.quadrant === 'CASH_COW' ? '#3B82F6' :
                                p.quadrant === 'OPPORTUNITY' ? '#D97706' : '#EF4444',
                            }}
                          >
                            {p.quadrant}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: ENTERPRISE CREDIT & RISK SCORING (Feature 1) */}
      {activeTab === 'credit-risk' && <CreditRiskTab />}

      {/* TAB 5: GOVT & BANKING SCHEME ELIGIBILITY (Feature 2) */}
      {activeTab === 'schemes' && <SchemeEligibilityTab />}

      {/* MODAL: RECORD EXPENSE */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Record Operating Expense"
        >
          <form onSubmit={handleCreateExpense} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Expense Category
              </label>
              <select
                value={txForm.category}
                onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)' }}
              >
                <option value="UTILITIES">Utilities (Electricity, Internet, Water)</option>
                <option value="RENT">Store / Warehouse Rent</option>
                <option value="SALARY">Staff Wages / Compensation</option>
                <option value="MAINTENANCE">Equipment Maintenance</option>
                <option value="LOGISTICS">Logistics & Transportation</option>
                <option value="OTHER">Other Operating Expense</option>
              </select>
            </div>

            <Input
              label="Expense Amount (₹)"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={txForm.amount}
              onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
              placeholder="e.g. 4500.00"
            />

            <Input
              label="Description / Invoice Reference"
              required
              value={txForm.description}
              onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
              placeholder="e.g. October warehouse power bill paid"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Record Expense</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

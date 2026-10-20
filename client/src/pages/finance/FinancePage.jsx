import { useState, useEffect, useContext } from 'react';
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Filter,
  Calendar,
  Lock,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';

export default function FinancePage() {
  const { role } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
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

  const loadData = async () => {
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

  useEffect(() => {
    loadData();
  }, [role, typeFilter, categoryFilter, startDate, endDate, page]);

  const handleRecordTransaction = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/transactions', {
        ...txForm,
        amount: parseFloat(txForm.amount),
      });
      showToast('Financial transaction recorded successfully', 'success');
      setIsModalOpen(false);
      setTxForm({ type: 'EXPENSE', category: 'UTILITIES', amount: '', description: '' });
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // If unauthorized (e.g. MANAGER or STAFF)
  if (!isAuthorized) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', maxWidth: '520px', margin: '40px auto' }}>
        <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0' }}>Financial Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
          The complete financial ledger, gross margin analysis, net profit calculations, and transaction records are restricted strictly to <strong>Business Owners</strong> and <strong>Administrators</strong>.
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
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>Financial Accounting & Ledger</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Authoritative Cash Flow, Profit & Loss Reconciliation, and Receivables Aging
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} style={{ marginRight: '6px' }} />
          Record Operational Expense
        </Button>
      </div>

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
          <div style={{ background: 'var(--bg-surface-hover)', padding: '10px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #3B82F6' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>31–60 Days</div>
            <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
              ₹{Number(summary?.receivables_aging?.['31-60'] || 0).toFixed(2)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface-hover)', padding: '10px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #F59E0B' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>61–90 Days</div>
            <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
              ₹{Number(summary?.receivables_aging?.['61-90'] || 0).toFixed(2)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface-hover)', padding: '10px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #EF4444' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>91+ Days (Overdue)</div>
            <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
              ₹{Number(summary?.receivables_aging?.['91+'] || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </Card>

      {/* Ledger Filter Bar */}
      <Card padding="sm">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '13px' }}
          >
            <option value="">All Flow Types</option>
            <option value="INCOME">Income (+)</option>
            <option value="EXPENSE">Expense (-)</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '13px' }}
          >
            <option value="">All Categories</option>
            <option value="SALES">SALES</option>
            <option value="PURCHASES">PURCHASES</option>
            <option value="UTILITIES">UTILITIES</option>
            <option value="PAYROLL">PAYROLL</option>
            <option value="LOGISTICS">LOGISTICS</option>
          </select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="From Date"
            style={{ width: '150px', fontSize: '12px' }}
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="To Date"
            style={{ width: '150px', fontSize: '12px' }}
          />

          <Button variant="secondary" onClick={() => loadData()}>Filter</Button>
        </div>
      </Card>

      {/* Detailed Transaction Ledger Table */}
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px' }}>Date/Time</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Description / Reference</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center' }}>Loading ledger...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No financial transactions recorded.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{new Date(tx.created_at).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '11px',
                          color: tx.type === 'INCOME' ? '#10B981' : '#EF4444',
                        }}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{tx.category}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {tx.description}
                      {tx.reference_id && <span style={{ fontSize: '11px' }}> (Ref: {tx.reference_id})</span>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: tx.type === 'INCOME' ? '#10B981' : '#EF4444' }}>
                      {tx.type === 'INCOME' ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: tx.is_reversed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: tx.is_reversed ? '#EF4444' : '#10B981',
                        }}
                      >
                        {tx.is_reversed ? 'REVERSED' : 'POSTED'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Manual Transaction Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Operational Ledger Entry">
          <form onSubmit={handleRecordTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Transaction Type</label>
                <select
                  value={txForm.type}
                  onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '13px' }}
                >
                  <option value="EXPENSE">Expense (-)</option>
                  <option value="INCOME">Income (+)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Category</label>
                <select
                  value={txForm.category}
                  onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '13px' }}
                >
                  <option value="UTILITIES">UTILITIES (Power, Water, Internet)</option>
                  <option value="PAYROLL">PAYROLL (Monthly Wages)</option>
                  <option value="RENT">FACILITY RENT</option>
                  <option value="LOGISTICS">FREIGHT & LOGISTICS</option>
                  <option value="MAINTENANCE">MAINTENANCE & REPAIR</option>
                  <option value="MISC_INCOME">MISCELLANEOUS INCOME</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Amount (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={txForm.amount}
                onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                placeholder="e.g. 3500.00"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Description / Reason</label>
              <Input
                type="text"
                required
                value={txForm.description}
                onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                placeholder="e.g. Electricity Bill for October 2026"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Record Transaction</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

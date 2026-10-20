import { useState, useEffect, useContext } from 'react';
import {
  FileBarChart,
  Download,
  Filter,
  Calendar,
  AlertTriangle,
  RotateCw,
  Lock,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import api from '../../api/client';

export default function ReportsPage() {
  const { role } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  // Data states
  const [reportData, setReportData] = useState(null);
  const [inventoryAnalytics, setInventoryAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const isDenied = role === 'STAFF';

  const loadCategories = async () => {
    try {
      const { data } = await api.get('/inventory/categories');
      if (data.success) setCategories(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReport = async () => {
    if (isDenied) return;
    setIsLoading(true);
    try {
      const payload = {
        start_date: startDate,
        end_date: endDate,
        category_id: selectedCategory || null,
        format: 'json',
      };

      const [repRes, invRes, alertRes] = await Promise.all([
        api.post('/reports/sales', payload),
        api.get('/analytics/inventory'),
        api.get('/alerts'),
      ]);

      if (repRes.data.success) setReportData(repRes.data.data);
      if (invRes.data.success) setInventoryAnalytics(invRes.data.data);
      if (alertRes.data.success) setAlerts(alertRes.data.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to generate report', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadReport();
  }, [role]);

  // Download CSV
  const handleDownloadCSV = async () => {
    try {
      const response = await api.post(
        '/reports/sales',
        {
          start_date: startDate,
          end_date: endDate,
          category_id: selectedCategory || null,
          format: 'csv',
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('CSV report downloaded successfully', 'success');
    } catch (err) {
      showToast('Failed to download CSV report', 'error');
    }
  };

  // Download JSON
  const handleDownloadJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sales_report_${startDate}_to_${endDate}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('JSON report downloaded successfully', 'success');
  };

  if (isDenied) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
        <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0' }}>Reports Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Business intelligence, sales reports, inventory analytics, and CSV exports are restricted to Store Managers and Business Owners (HTTP 403 Forbidden).
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>Reports & Business Intelligence</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Filtered Realized Sales Reports, RFC 4180 CSV / JSON Export & ROP Analytics
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleDownloadCSV} disabled={!reportData?.items?.length}>
            <Download size={15} style={{ marginRight: '6px' }} />
            Download CSV
          </Button>
          <Button variant="secondary" onClick={handleDownloadJSON} disabled={!reportData?.items?.length}>
            <Download size={15} style={{ marginRight: '6px' }} />
            Download JSON
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card padding="md">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>From Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ fontSize: '12px' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>To Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ fontSize: '12px' }} />
          </div>

          <div style={{ minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Category Filter</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '13px' }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <Button variant="primary" onClick={loadReport} disabled={isLoading}>
            <RotateCw size={14} style={{ marginRight: '6px' }} />
            {isLoading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </Card>

      {/* Summary Metrics */}
      {reportData?.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
          <Card padding="md">
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Orders Realized</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>{reportData.summary.total_sales_count}</div>
          </Card>
          <Card padding="md">
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Units Sold</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>{reportData.summary.total_units_sold}</div>
          </Card>
          <Card padding="md">
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Realized Revenue</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
              ₹{Number(reportData.summary.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </Card>
          <Card padding="md">
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>GST Tax Collected</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#3B82F6', marginTop: '4px' }}>
              ₹{Number(reportData.summary.total_tax).toFixed(2)}
            </div>
          </Card>
        </div>
      )}

      {/* Sales Items Report Table */}
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '14px' }}>
          Line-Item Sales Breakdown ({reportData?.items?.length || 0} entries)
        </div>
        <div style={{ overflowX: 'auto', maxHeight: '320px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Invoice</th>
                <th style={{ padding: '10px 14px' }}>Date</th>
                <th style={{ padding: '10px 14px' }}>Customer</th>
                <th style={{ padding: '10px 14px' }}>Category</th>
                <th style={{ padding: '10px 14px' }}>Product</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Unit Price</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {!reportData?.items?.length ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No sales found for the selected period.
                  </td>
                </tr>
              ) : (
                reportData.items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{it.invoice_number}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{it.created_at}</td>
                    <td style={{ padding: '10px 14px' }}>{it.customer_name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{it.category_name}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{it.product_name}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{it.quantity}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>₹{Number(it.unit_price).toFixed(2)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>₹{Number(it.line_total).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dynamic ROP & Stock Velocity Insights */}
      {inventoryAnalytics && (
        <Card padding="md">
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>
              Dynamic Reorder Point (ROP) & Stock Velocity Insights
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>
              Calculated using formula: <code>ROP = (Avg Daily 30d Usage × Supplier Lead Time) + Safety Stock</code>
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 12px' }}>Product</th>
                  <th style={{ padding: '8px 12px' }}>SKU</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Current Stock</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Avg Daily Usage</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Lead Time</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Safety Stock</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Computed ROP</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Replenish Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryAnalytics.rop_recommendations?.map((r) => (
                  <tr key={r.product_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.product_name}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{r.sku}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{r.current_stock}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r.avg_daily_usage} /day</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.lead_time_days}d</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.safety_stock}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#4F46E5' }}>{r.reorder_point}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: r.recommended_order_quantity > 0 ? '#EF4444' : 'inherit' }}>
                      {r.recommended_order_quantity > 0 ? `+${r.recommended_order_quantity}` : '0'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: r.status === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : r.status === 'REORDER_NOW' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: r.status === 'CRITICAL' ? '#EF4444' : r.status === 'REORDER_NOW' ? '#F59E0B' : '#10B981',
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

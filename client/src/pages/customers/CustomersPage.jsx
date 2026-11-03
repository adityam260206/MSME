import { useState, useEffect, useContext } from 'react';
import { Users, Plus, Search, Edit2, History, Phone, Mail, DollarSign, Star, ShieldCheck, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';

export default function CustomersPage() {
  const { role } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '' });

  // Detail Modal & Tabs: 'history' | 'reliability' | 'feedback'
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);
  const [customerModalTab, setCustomerModalTab] = useState('reliability');
  const [customerReliability, setCustomerReliability] = useState(null);
  const [customerFeedback, setCustomerFeedback] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Add Feedback Form
  const [isAddingFeedback, setIsAddingFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, comment: '', sale_id: '' });

  const canEdit = ['ADMIN', 'OWNER', 'MANAGER'].includes(role);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/business/customers?search=${encodeURIComponent(search)}`);
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleOpenModal = (cust = null) => {
    if (cust) {
      setEditingCustomer(cust);
      setCustomerForm({ name: cust.name, email: cust.email || '', phone: cust.phone || '' });
    } else {
      setEditingCustomer(null);
      setCustomerForm({ name: '', email: '', phone: '' });
    }
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.put(`/business/customers/${editingCustomer.id}`, {
          name: customerForm.name,
          email: customerForm.email || null,
          phone: customerForm.phone || null,
        });
        showToast('Customer profile updated', 'success');
      } else {
        await api.post('/business/customers', {
          name: customerForm.name,
          email: customerForm.email || null,
          phone: customerForm.phone || null,
        });
        showToast('Customer registered successfully', 'success');
      }
      setIsCustomerModalOpen(false);
      loadCustomers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleViewDetail = async (cust, initialTab = 'reliability') => {
    setCustomerModalTab(initialTab);
    setIsDetailLoading(true);
    try {
      const [detailRes, relRes, feedRes] = await Promise.all([
        api.get(`/business/customers/${cust.id}`),
        api.get(`/customers/${cust.id}/reliability`),
        api.get(`/customers/${cust.id}/feedback`),
      ]);

      if (detailRes.data.success) setSelectedCustomerDetail(detailRes.data.data);
      if (relRes.data.success) setCustomerReliability(relRes.data.data);
      if (feedRes.data.success) setCustomerFeedback(feedRes.data.data);
    } catch (err) {
      showToast(err.message || 'Error loading customer details', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!selectedCustomerDetail) return;
    try {
      const res = await api.post(`/customers/${selectedCustomerDetail.customer.id}/feedback`, {
        rating: parseInt(feedbackForm.rating),
        comment: feedbackForm.comment || null,
        sale_id: feedbackForm.sale_id || null,
      });
      if (res.data.success) {
        showToast('Customer review saved successfully', 'success');
        setIsAddingFeedback(false);
        setFeedbackForm({ rating: 5, comment: '', sale_id: '' });
        // Reload feedback
        const feedRes = await api.get(`/customers/${selectedCustomerDetail.customer.id}/feedback`);
        if (feedRes.data.success) setCustomerFeedback(feedRes.data.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit review', 'error');
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'A': return '#10B981';
      case 'B': return '#3B82F6';
      case 'C': return '#F59E0B';
      case 'D': return '#EF4444';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>Customer CRM & Rating Intelligence</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Client Profiles, Commercial Reliability Scoring & Verified Reviews
          </p>
        </div>

        <Button variant="primary" onClick={() => handleOpenModal()}>
          <Plus size={16} />
          Register Customer
        </Button>
      </div>

      {/* Search */}
      <Card padding="sm">
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search by customer name, phone number, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              padding: '0 12px 0 36px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-root)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
            }}
          />
        </div>
      </Card>

      {/* Directory Grid / Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 'var(--space-4)' }}>
        {isLoading ? (
          <div style={{ padding: '32px', gridColumn: '1 / -1', textAlign: 'center' }}>Loading customers...</div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '32px', gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No registered customers found.
          </div>
        ) : (
          customers.map((c) => (
            <Card key={c.id} padding="md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>{c.name}</h3>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      ID: {c.id.slice(0, 8)}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleOpenModal(c)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                      title="Edit Contact"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  {c.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={12} /> {c.phone}
                    </div>
                  )}
                  {c.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={12} /> {c.email}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Lifetime Spend</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#10B981' }}>
                    ₹{Number(c.total_spent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button size="sm" variant="secondary" onClick={() => handleViewDetail(c, 'reliability')} title="View Reliability & Reviews">
                    <ShieldCheck size={13} style={{ marginRight: '4px' }} />
                    Ratings
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleViewDetail(c, 'history')} title="View Orders">
                    <History size={13} />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Customer Create/Edit Modal */}
      {isCustomerModalOpen && (
        <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title={editingCustomer ? 'Edit Customer Contact' : 'Register New Customer'}>
          <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Customer / Company Name</label>
              <Input
                type="text"
                required
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar or Apex Industries"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Phone Number</label>
              <Input
                type="text"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Email Address</label>
              <Input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsCustomerModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Customer</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Customer Comprehensive Profile Drawer / Modal */}
      {selectedCustomerDetail && (
        <Modal
          isOpen={!!selectedCustomerDetail}
          onClose={() => { setSelectedCustomerDetail(null); setCustomerReliability(null); setCustomerFeedback(null); }}
          title={`Customer 360: ${selectedCustomerDetail.customer.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Customer Header Info */}
            <div style={{ background: 'var(--bg-surface-hover)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>{selectedCustomerDetail.customer.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                  Phone: {selectedCustomerDetail.customer.phone || 'N/A'} • Email: {selectedCustomerDetail.customer.email || 'N/A'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Lifetime Value:</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }}>
                  ₹{Number(selectedCustomerDetail.customer.total_spent).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <button
                onClick={() => setCustomerModalTab('reliability')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: customerModalTab === 'reliability' ? 'var(--color-brand)' : 'transparent',
                  color: customerModalTab === 'reliability' ? '#FFF' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ShieldCheck size={14} />
                <span>Internal Reliability Indicator</span>
              </button>

              <button
                onClick={() => setCustomerModalTab('feedback')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: customerModalTab === 'feedback' ? 'var(--color-brand)' : 'transparent',
                  color: customerModalTab === 'feedback' ? '#FFF' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Star size={14} />
                <span>Customer Reviews & Feedback</span>
              </button>

              <button
                onClick={() => setCustomerModalTab('history')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: customerModalTab === 'history' ? 'var(--color-brand)' : 'transparent',
                  color: customerModalTab === 'history' ? '#FFF' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <History size={14} />
                <span>Purchase History</span>
              </button>
            </div>

            {/* TAB CONTENT: 1. INTERNAL RELIABILITY */}
            {customerModalTab === 'reliability' && (
              <div>
                {isDetailLoading ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Calculating reliability...</div>
                ) : customerReliability ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'var(--bg-root)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          border: `4px solid ${getTierColor(customerReliability.reliability_tier)}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <span style={{ fontSize: '20px', fontWeight: 900 }}>{customerReliability.reliability_score}</span>
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>/ 100</span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              background: `${getTierColor(customerReliability.reliability_tier)}22`,
                              color: getTierColor(customerReliability.reliability_tier),
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800
                            }}
                          >
                            Tier {customerReliability.reliability_tier} • {customerReliability.reliability_label}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Objective indicator based on completed transaction volume, settlement discipline, and recency.
                        </div>
                      </div>
                    </div>

                    {/* Contributing Criteria Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                      <div style={{ padding: '8px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Total Completed Orders</div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>{customerReliability.metrics_snapshot?.total_orders || 0}</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Lifetime Revenue</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981' }}>
                          ₹{Number(customerReliability.metrics_snapshot?.total_spent || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Avg Order Value</div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>
                          ₹{Number(customerReliability.metrics_snapshot?.avg_order_value || 0).toFixed(0)}
                        </div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Days Since Last Order</div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>
                          {customerReliability.metrics_snapshot?.days_since_last_purchase ?? 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Explanations */}
                    {customerReliability.explanations?.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <strong>Contributing Factors:</strong>
                        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                          {customerReliability.explanations.map((exp, i) => (
                            <li key={i}>{exp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No reliability data found.</div>
                )}
              </div>
            )}

            {/* TAB CONTENT: 2. CUSTOMER FEEDBACK & REVIEWS */}
            {customerModalTab === 'feedback' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Summary Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-root)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B' }}>
                      <Star size={20} fill="#F59E0B" />
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {customerFeedback?.summary?.average_rating ? customerFeedback.summary.average_rating.toFixed(1) : 'No Ratings'}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      ({customerFeedback?.summary?.total_reviews || 0} customer reviews)
                    </span>
                  </div>

                  <Button size="sm" variant="secondary" onClick={() => setIsAddingFeedback(!isAddingFeedback)}>
                    <MessageSquare size={13} style={{ marginRight: '4px' }} />
                    {isAddingFeedback ? 'Cancel' : 'Add Review'}
                  </Button>
                </div>

                {/* Add Feedback Form */}
                {isAddingFeedback && (
                  <form onSubmit={handleSubmitFeedback} style={{ padding: '12px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700 }}>Record Customer Feedback</div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Star Rating (1 to 5)</label>
                      <select
                        value={feedbackForm.rating}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: e.target.value })}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '12px' }}
                      >
                        <option value="5">⭐⭐⭐⭐⭐ 5 Stars - Excellent</option>
                        <option value="4">⭐⭐⭐⭐ 4 Stars - Good</option>
                        <option value="3">⭐⭐⭐ 3 Stars - Average</option>
                        <option value="2">⭐⭐ 2 Stars - Poor</option>
                        <option value="1">⭐ 1 Star - Unsatisfactory</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Associate With Invoice (Optional)</label>
                      <select
                        value={feedbackForm.sale_id}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, sale_id: e.target.value })}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '12px' }}
                      >
                        <option value="">No specific invoice (General Store Feedback)</option>
                        {selectedCustomerDetail.recent_purchases?.map((s) => (
                          <option key={s.id} value={s.id}>
                            Invoice #{s.invoice_number} (₹{Number(s.total_amount).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Review Notes / Feedback</label>
                      <Input
                        type="text"
                        placeholder="e.g. Prompt delivery, high quality products delivered on time"
                        value={feedbackForm.comment}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <Button size="sm" type="submit" variant="primary">Submit Review</Button>
                    </div>
                  </form>
                )}

                {/* Reviews List */}
                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {!customerFeedback?.feedback || customerFeedback.feedback.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      No customer reviews submitted yet.
                    </div>
                  ) : (
                    customerFeedback.feedback.map((item) => (
                      <div key={item.id} style={{ padding: '10px 12px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B' }}>
                            {Array.from({ length: item.rating }).map((_, i) => (
                              <Star key={i} size={12} fill="#F59E0B" />
                            ))}
                            <span style={{ fontSize: '12px', fontWeight: 700, marginLeft: '4px', color: 'var(--text-primary)' }}>
                              {item.rating}/5
                            </span>
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {item.comment && (
                          <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-primary)' }}>
                            "{item.comment}"
                          </div>
                        )}
                        {item.sale_id && (
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Verified Purchase • Invoice #{item.sale_id.slice(0, 8)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. PURCHASE HISTORY */}
            {customerModalTab === 'history' && (
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>Past Completed Orders:</div>
                {selectedCustomerDetail.recent_purchases?.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    No purchases recorded yet.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                        <th style={{ padding: '6px' }}>Invoice</th>
                        <th style={{ padding: '6px' }}>Date</th>
                        <th style={{ padding: '6px', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '6px', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCustomerDetail.recent_purchases?.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '6px', fontWeight: 600 }}>{s.invoice_number}</td>
                          <td style={{ padding: '6px', color: 'var(--text-secondary)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>₹{Number(s.total_amount).toFixed(2)}</td>
                          <td style={{ padding: '6px', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>{s.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

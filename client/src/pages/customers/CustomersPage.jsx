import { useState, useEffect, useContext } from 'react';
import { Users, Plus, Search, Edit2, History, Phone, Mail, DollarSign } from 'lucide-react';
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

  // History Drawer
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);

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

  const handleViewDetail = async (cust) => {
    try {
      const { data } = await api.get(`/business/customers/${cust.id}`);
      if (data.success) {
        setSelectedCustomerDetail(data.data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>Customer Relationship Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Registered Client Directory, Cumulative Spend & Order History
          </p>
        </div>

        <Button variant="primary" onClick={() => handleOpenModal()}>
          <Plus size={16} style={{ marginRight: '6px' }} />
          Register Customer
        </Button>
      </div>

      {/* Search */}
      <Card padding="sm">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} />
          <Input
            type="text"
            placeholder="Search by customer name, phone number, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '32px' }}
          />
        </div>
      </Card>

      {/* Directory Grid / Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
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
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>{c.name}</h3>
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

                <Button size="sm" variant="secondary" onClick={() => handleViewDetail(c)}>
                  <History size={13} style={{ marginRight: '4px' }} />
                  Orders
                </Button>
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

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomerDetail && (
        <Modal isOpen={!!selectedCustomerDetail} onClose={() => setSelectedCustomerDetail(null)} title={`Customer History: ${selectedCustomerDetail.customer.name}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--bg-surface-hover)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <div>
                <div><strong>Phone:</strong> {selectedCustomerDetail.customer.phone || 'N/A'}</div>
                <div><strong>Email:</strong> {selectedCustomerDetail.customer.email || 'N/A'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cumulative Spend:</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }}>
                  ₹{Number(selectedCustomerDetail.customer.total_spent).toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>Recent Completed Sales:</div>
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
          </div>
        </Modal>
      )}
    </div>
  );
}

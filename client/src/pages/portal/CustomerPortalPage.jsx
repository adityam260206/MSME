import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  User,
  Package,
  FileText,
  Star,
  LogOut,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MessageSquare
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import axios from 'axios';

export default function CustomerPortalPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('customer_token');

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'reviews' | 'profile'
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invoice Modal
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Review Modal
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Profile Edit State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // Setup customer axios instance with customer JWT
  const customerApi = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const loadCustomerData = async () => {
    if (!token) {
      navigate('/portal/login');
      return;
    }

    setIsLoading(true);
    try {
      const [profRes, ordRes, revRes] = await Promise.all([
        customerApi.get('/customer-portal/profile'),
        customerApi.get('/customer-portal/orders'),
        customerApi.get('/customer-portal/reviews'),
      ]);

      if (profRes.data.success) {
        setProfile(profRes.data.data);
        setEditName(profRes.data.data.name);
        setEditPhone(profRes.data.data.phone || '');
      }
      if (ordRes.data.success) setOrders(ordRes.data.data || []);
      if (revRes.data.success) setReviews(revRes.data.data || []);
    } catch (err) {
      console.error('Customer data loading error', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('customer_token');
        navigate('/portal/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    navigate('/portal/login');
  };

  const handleOpenInvoice = async (orderId) => {
    try {
      const res = await customerApi.get(`/customer-portal/orders/${orderId}/invoice`);
      if (res.data.success) {
        setViewingInvoice(res.data.data);
        setIsInvoiceOpen(true);
      }
    } catch (err) {
      alert('Failed to retrieve invoice document');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewOrder) return;
    setIsSubmittingReview(true);
    try {
      const res = await customerApi.post(`/customer-portal/orders/${reviewOrder.id}/review`, {
        rating: parseInt(reviewRating),
        comment: reviewComment || null,
      });
      if (res.data.success) {
        alert('Thank you! Your feedback has been verified and posted.');
        setReviewOrder(null);
        setReviewComment('');
        // Reload reviews & orders
        loadCustomerData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage('');
    try {
      const res = await customerApi.put('/customer-portal/profile', {
        name: editName,
        phone: editPhone || null,
      });
      if (res.data.success) {
        setProfile(res.data.data);
        setProfileMessage('Profile details updated successfully');
      }
    } catch (err) {
      setProfileMessage('Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading Customer Portal Dashboard...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-root)', color: 'var(--text-primary)' }}>
      {/* Top Customer Navigation Bar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              fontWeight: 800
            }}
          >
            360
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>MSME360 Buyer Portal</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Logged in as: <strong>{profile?.name}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/login"
            style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none', marginRight: '8px' }}
          >
            Enterprise Console ↗
          </Link>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <LogOut size={14} style={{ marginRight: '6px' }} />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Welcome Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(6, 182, 212, 0.1))',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Hello, {profile?.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
              Access your purchase history, download tax invoices, and manage your feedback reviews.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Lifetime Purchases</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#10B981' }}>
                ₹{Number(profile?.total_spent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'orders' ? 'var(--color-brand)' : 'transparent',
              color: activeTab === 'orders' ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Package size={15} />
            <span>My Orders ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'reviews' ? 'var(--color-brand)' : 'transparent',
              color: activeTab === 'reviews' ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Star size={15} />
            <span>My Reviews ({reviews.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'profile' ? 'var(--color-brand)' : 'transparent',
              color: activeTab === 'profile' ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <User size={15} />
            <span>Profile & Security</span>
          </button>
        </div>

        {/* TAB 1: MY ORDERS & INVOICES */}
        {activeTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.length === 0 ? (
              <Card padding="lg">
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  <Package size={36} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                  <p>You have not placed any orders yet.</p>
                </div>
              </Card>
            ) : (
              orders.map((ord) => (
                <Card key={ord.id} padding="md">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace' }}>
                          Invoice #{ord.invoice_number}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: ord.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: ord.status === 'COMPLETED' ? '#10B981' : '#EF4444'
                          }}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Order Date: {new Date(ord.created_at).toLocaleString()} • Paid via {ord.payment_method}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Total Amount</div>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#10B981' }}>
                          ₹{Number(ord.total_amount).toFixed(2)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="sm" variant="secondary" onClick={() => handleOpenInvoice(ord.id)}>
                          <FileText size={13} style={{ marginRight: '4px' }} />
                          View Invoice
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setReviewOrder(ord)}>
                          <Star size={13} style={{ marginRight: '4px' }} />
                          Rate Purchase
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* TAB 2: MY SUBMITTED REVIEWS */}
        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reviews.length === 0 ? (
              <Card padding="lg">
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  <Star size={36} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                  <p>You haven't submitted any reviews yet.</p>
                </div>
              </Card>
            ) : (
              reviews.map((rev) => (
                <Card key={rev.id} padding="md">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B' }}>
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} size={14} fill="#F59E0B" />
                      ))}
                      <span style={{ fontSize: '13px', fontWeight: 800, marginLeft: '6px', color: 'var(--text-primary)' }}>
                        {rev.rating}/5
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {new Date(rev.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {rev.comment && (
                    <div style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-primary)' }}>
                      "{rev.comment}"
                    </div>
                  )}
                  {rev.sale_id && (
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Verified Purchase • Order ID: {rev.sale_id.slice(0, 8)}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* TAB 3: PROFILE & SECURITY */}
        {activeTab === 'profile' && (
          <Card padding="lg" style={{ maxWidth: '540px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0' }}>Manage Account Details</h3>
            {profileMessage && (
              <div style={{ padding: '8px 12px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontSize: '12px', marginBottom: '12px' }}>
                {profileMessage}
              </div>
            )}
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Account Name</label>
                <Input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Email Address (Login ID)</label>
                <Input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Email address cannot be changed</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Phone Number</label>
                <Input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button type="submit" variant="primary" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      {/* VIEW INVOICE MODAL */}
      {isInvoiceOpen && viewingInvoice && (
        <Modal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          title={`Tax Invoice: ${viewingInvoice.sale?.invoice_number}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div id="printable-customer-receipt" style={{ padding: '12px', background: '#FFF', color: '#000', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', fontSize: '11px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '10px' }}>
                <h2 style={{ margin: '4px 0 2px 0', fontSize: '16px', fontWeight: 800 }}>BHARAT ENTERPRISES & TRADING</h2>
                <div>Tax Invoice • GSTIN: 29AAAAA0000A1Z5</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <div><strong>Invoice #:</strong> {viewingInvoice.sale?.invoice_number}</div>
                  <div><strong>Date:</strong> {new Date(viewingInvoice.sale?.created_at).toLocaleString()}</div>
                  <div><strong>Billed To:</strong> {viewingInvoice.sale?.customer_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Status:</strong> {viewingInvoice.sale?.status}</div>
                  <div><strong>Payment Method:</strong> {viewingInvoice.sale?.payment_method}</div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                    <th style={{ textAlign: 'left', padding: '4px 0' }}>Item</th>
                    <th style={{ textAlign: 'center', padding: '4px 0' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '4px 0' }}>Rate (₹)</th>
                    <th style={{ textAlign: 'right', padding: '4px 0' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingInvoice.sale?.items?.map((it) => (
                    <tr key={it.id}>
                      <td style={{ padding: '3px 0' }}>{it.product_name}</td>
                      <td style={{ textAlign: 'center', padding: '3px 0' }}>{it.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '3px 0' }}>{Number(it.unit_price).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '3px 0' }}>{Number(it.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '1px dashed #000', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>₹{Number(viewingInvoice.sale?.subtotal).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GST ({viewingInvoice.sale?.tax_rate}%):</span>
                  <span>+₹{Number(viewingInvoice.sale?.tax_amount).toFixed(2)}</span>
                </div>
                {Number(viewingInvoice.sale?.discount_amount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Discount:</span>
                    <span>-₹{Number(viewingInvoice.sale?.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '13px', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '2px' }}>
                  <span>TOTAL PAID:</span>
                  <span>₹{Number(viewingInvoice.sale?.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsInvoiceOpen(false)}>Close</Button>
              <Button variant="primary" onClick={() => window.print()}>
                <Printer size={15} style={{ marginRight: '6px' }} />
                Print / Save PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* SUBMIT REVIEW MODAL */}
      {reviewOrder && (
        <Modal
          isOpen={!!reviewOrder}
          onClose={() => setReviewOrder(null)}
          title={`Rate Purchase: Invoice #${reviewOrder.invoice_number}`}
        >
          <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Rating (1 to 5 Stars)
              </label>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '13px' }}
              >
                <option value="5">⭐⭐⭐⭐⭐ 5 Stars - Excellent Experience</option>
                <option value="4">⭐⭐⭐⭐ 4 Stars - Very Good</option>
                <option value="3">⭐⭐⭐ 3 Stars - Average</option>
                <option value="2">⭐⭐ 2 Stars - Below Expectations</option>
                <option value="1">⭐ 1 Star - Unsatisfactory</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Review Comments (Optional)
              </label>
              <Input
                type="text"
                placeholder="Share your experience with the products received..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button type="button" variant="secondary" onClick={() => setReviewOrder(null)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={isSubmittingReview}>
                {isSubmittingReview ? 'Submitting...' : 'Submit Verified Review'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

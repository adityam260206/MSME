import { useState, useEffect, useContext, useRef } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  RotateCcw,
  User,
  CreditCard,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';

export default function SalesPOSPage() {
  const { role } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // POS State
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [guestName, setGuestName] = useState('Guest Customer');
  const [isGuest, setIsGuest] = useState(true);
  const [taxRate, setTaxRate] = useState(5.0);
  const [discountAmount, setDiscountAmount] = useState(0.0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Completed Invoice Modal
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const barcodeInputRef = useRef(null);

  const loadInitialData = async () => {
    try {
      const [prodRes, custRes, salesRes] = await Promise.all([
        api.get('/inventory/products?limit=100'),
        api.get('/business/customers'),
        api.get('/business/sales?limit=10'),
      ]);

      if (prodRes.data.success) setProducts(prodRes.data.data || []);
      if (custRes.data.success) setCustomers(custRes.data.data || []);
      if (salesRes.data.success) setSalesHistory(salesRes.data.data || []);
    } catch (err) {
      console.error('Failed to load POS data', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Filtered products for search
  const filteredProducts = products.filter(
    (p) =>
      p.stock_quantity > 0 &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Cart operations
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          showToast(`Cannot exceed available stock (${product.stock_quantity})`, 'error');
          return prev;
        }
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          unit_price: parseFloat(product.selling_price),
          stock_quantity: product.stock_quantity,
          quantity: 1,
        },
      ];
    });
    setSearchQuery('');
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock_quantity) {
              showToast(`Only ${item.stock_quantity} available in stock`, 'error');
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = (subtotal * (parseFloat(taxRate) || 0)) / 100.0;
  const grandTotal = Math.max(0, subtotal + taxAmount - (parseFloat(discountAmount) || 0));

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Add products to proceed.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        customer_id: isGuest ? null : selectedCustomerId || null,
        customer_name: isGuest ? guestName : customers.find((c) => c.id === selectedCustomerId)?.name || 'Guest Customer',
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        tax_rate: parseFloat(taxRate) || 0,
        discount_amount: parseFloat(discountAmount) || 0,
        payment_method: paymentMethod,
      };

      const { data } = await api.post('/business/sales', payload);
      if (data.success) {
        showToast('Sale completed successfully!', 'success');
        setCompletedInvoice(data.data);
        setIsInvoiceModalOpen(true);
        setCart([]);
        loadInitialData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel Sale
  const handleCancelSale = async (saleId) => {
    if (!window.confirm('Are you sure you want to cancel this sale? Stock will be restored via RETURN movements.')) {
      return;
    }
    try {
      const { data } = await api.post(`/business/sales/${saleId}/cancel`);
      if (data.success) {
        showToast('Sale cancelled and stock restored successfully', 'success');
        loadInitialData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const canCancel = ['ADMIN', 'OWNER', 'MANAGER'].includes(role);

  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>Sales & POS Counter</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
          Point of Sale Checkout, Barcode Lookup, Invoicing & Returns
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Left Column: Product Selection & Catalog Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card padding="md">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
              <Search size={18} style={{ color: 'var(--text-secondary)' }} />
              <Input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan Barcode or Type Product Name / SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{ flex: 1 }}
              />
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {searchQuery ? 'No in-stock products matching search.' : 'Type or scan to search products...'}
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-hover)',
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand)')}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = 'transparent')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        SKU: {p.sku} • In Stock: <strong>{p.stock_quantity}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#10B981' }}>
                        ₹{Number(p.selling_price).toFixed(2)}
                      </div>
                      <Button size="sm" variant="secondary" style={{ padding: '4px 8px' }}>
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent Sales History */}
          <Card padding="md">
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0' }}>Recent Invoices</h3>
            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '6px' }}>Invoice</th>
                    <th style={{ padding: '6px' }}>Customer</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Status</th>
                    {canCancel && <th style={{ padding: '6px', textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px', fontWeight: 600 }}>{s.invoice_number}</td>
                      <td style={{ padding: '6px', color: 'var(--text-secondary)' }}>{s.customer_name}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>₹{Number(s.total_amount).toFixed(2)}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: s.status === 'COMPLETED' ? '#10B981' : '#EF4444' }}>
                          {s.status}
                        </span>
                      </td>
                      {canCancel && (
                        <td style={{ padding: '6px', textAlign: 'right' }}>
                          {s.status === 'COMPLETED' && (
                            <button
                              onClick={() => handleCancelSale(s.id)}
                              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Active Cart & Checkout */}
        <div>
          <Card padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={18} />
                Current Cart ({cart.length})
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer' }}
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Toggle */}
            <div style={{ background: 'var(--bg-surface-hover)', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsGuest(true)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: isGuest ? 'var(--color-brand)' : 'transparent',
                    color: isGuest ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Walk-in Guest
                </button>
                <button
                  type="button"
                  onClick={() => setIsGuest(false)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: !isGuest ? 'var(--color-brand)' : 'transparent',
                    color: !isGuest ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Registered Customer
                </button>
              </div>

              {isGuest ? (
                <Input
                  type="text"
                  placeholder="Guest Customer Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  style={{ fontSize: '12px' }}
                />
              ) : (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '12px' }}
                >
                  <option value="">Select Registered Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone || c.email || 'No contact'})</option>
                  ))}
                </select>
              )}
            </div>

            {/* Cart Items List */}
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {cart.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Cart is empty. Add products to begin checkout.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                    }}
                  >
                    <div style={{ flex: 1, marginRight: '8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        ₹{item.unit_price.toFixed(2)} each
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => updateQuantity(item.product_id, -1)}
                        style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: 700, fontSize: '13px', minWidth: '18px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product_id, 1)}
                        style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={12} />
                      </button>
                      <div style={{ width: '60px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                        ₹{(item.quantity * item.unit_price).toFixed(2)}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pricing Controls: Tax & Discount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>GST Tax Rate (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Discount (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                />
              </div>
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Payment Mode</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '12px' }}
              >
                <option value="CASH">Cash Counter</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
              </select>
            </div>

            {/* Financial Totals Summary */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>GST Tax ({taxRate}%):</span>
                <span>+₹{taxAmount.toFixed(2)}</span>
              </div>
              {parseFloat(discountAmount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444' }}>
                  <span>Discount:</span>
                  <span>-₹{parseFloat(discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, marginTop: '6px', color: '#10B981', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px' }}>
                <span>Grand Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              disabled={cart.length === 0 || isLoading}
              onClick={handleCheckout}
              style={{ width: '100%', marginTop: '16px', padding: '12px', fontWeight: 700 }}
            >
              {isLoading ? 'Processing Sale...' : `Finalize Sale (₹${grandTotal.toFixed(2)})`}
            </Button>
          </Card>
        </div>
      </div>

      {/* Completed Invoice Modal (Printable) */}
      {isInvoiceModalOpen && completedInvoice && (
        <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title="Sale Receipt & Tax Invoice">
          <div id="printable-receipt" style={{ padding: '8px', fontFamily: 'monospace' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '12px' }}>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800 }}>BHARAT ENTERPRISES & TRADING</h2>
              <div style={{ fontSize: '11px' }}>Plot 42, Electronic City, Bangalore</div>
              <div style={{ fontSize: '11px' }}>Tax Invoice • GSTIN: 29AAAAA0000A1Z5</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px' }}>
              <div>
                <div><strong>Invoice #:</strong> {completedInvoice.invoice_number}</div>
                <div><strong>Date:</strong> {new Date(completedInvoice.created_at).toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div><strong>Customer:</strong> {completedInvoice.customer_name}</div>
                <div><strong>Mode:</strong> {completedInvoice.payment_method}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                  <th style={{ textAlign: 'left', padding: '4px 0' }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '4px 0' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '4px 0' }}>Rate</th>
                  <th style={{ textAlign: 'right', padding: '4px 0' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {completedInvoice.items?.map((it) => (
                  <tr key={it.id}>
                    <td style={{ padding: '4px 0' }}>{it.product_name}</td>
                    <td style={{ textAlign: 'center', padding: '4px 0' }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>₹{Number(it.unit_price).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>₹{Number(it.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{Number(completedInvoice.subtotal).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>GST Tax ({completedInvoice.tax_rate}%):</span>
                <span>+₹{Number(completedInvoice.tax_amount).toFixed(2)}</span>
              </div>
              {Number(completedInvoice.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount:</span>
                  <span>-₹{Number(completedInvoice.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '14px', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '4px' }}>
                <span>TOTAL PAID:</span>
                <span>₹{Number(completedInvoice.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '10px', color: '#666' }}>
              Thank you for your business! Powered by MSME360.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button variant="secondary" onClick={() => setIsInvoiceModalOpen(false)}>Close</Button>
              <Button variant="primary" onClick={() => window.print()}>
                <Printer size={16} style={{ marginRight: '6px' }} />
                Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

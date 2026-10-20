import { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Truck, Plus, Search, RotateCcw, Eye, FileText, CheckCircle } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';

export default function PurchasesPage() {
  const { role } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const location = useLocation();

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Purchase Modal
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([
    { product_id: '', quantity: 1, unit_cost: '' }
  ]);
  const [taxRate, setTaxRate] = useState(5.0);
  const [discountAmount, setDiscountAmount] = useState(0.0);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');

  // View Details Modal
  const [viewingPurchase, setViewingPurchase] = useState(null);

  const canCancel = ['ADMIN', 'OWNER'].includes(role);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [purchRes, supRes, prodRes] = await Promise.all([
        api.get('/business/purchases'),
        api.get('/business/suppliers'),
        api.get('/inventory/products?limit=100'),
      ]);

      if (purchRes.data.success) setPurchases(purchRes.data.data || []);
      if (supRes.data.success) setSuppliers(supRes.data.data || []);
      if (prodRes.data.success) setProducts(prodRes.data.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (location.state?.prefillItem && products.length > 0) {
      const it = location.state.prefillItem;
      if (it.supplier_id) setSelectedSupplierId(it.supplier_id);
      else if (suppliers.length > 0) setSelectedSupplierId(suppliers[0].id);

      setPurchaseItems([
        {
          product_id: it.product_id,
          quantity: it.quantity || 10,
          unit_cost: it.unit_cost || '',
        }
      ]);
      setIsNewPurchaseModalOpen(true);
    }
  }, [location.state, products, suppliers]);

  const handleAddItemRow = () => {
    setPurchaseItems([...purchaseItems, { product_id: '', quantity: 1, unit_cost: '' }]);
  };

  const handleRemoveItemRow = (idx) => {
    if (purchaseItems.length === 1) return;
    setPurchaseItems(purchaseItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, val) => {
    setPurchaseItems(
      purchaseItems.map((item, i) => {
        if (i === idx) {
          const updated = { ...item, [field]: val };
          if (field === 'product_id') {
            const p = products.find((prod) => prod.id === val);
            if (p && !updated.unit_cost) {
              updated.unit_cost = p.cost_price || '';
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const subtotal = purchaseItems.reduce(
    (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0),
    0
  );
  const taxAmount = (subtotal * (parseFloat(taxRate) || 0)) / 100.0;
  const grandTotal = Math.max(0, subtotal + taxAmount - (parseFloat(discountAmount) || 0));

  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      showToast('Please select a supplier', 'error');
      return;
    }
    const validItems = purchaseItems.filter((it) => it.product_id && it.quantity > 0 && it.unit_cost > 0);
    if (validItems.length === 0) {
      showToast('Please add at least one valid line item with positive quantity and unit cost', 'error');
      return;
    }

    try {
      const payload = {
        supplier_id: selectedSupplierId,
        items: validItems.map((it) => ({
          product_id: it.product_id,
          quantity: parseInt(it.quantity, 10),
          unit_cost: parseFloat(it.unit_cost),
        })),
        tax_rate: parseFloat(taxRate) || 0,
        discount_amount: parseFloat(discountAmount) || 0,
        payment_method: paymentMethod,
      };

      const { data } = await api.post('/business/purchases', payload);
      if (data.success) {
        showToast('Purchase Order completed and stock restocked successfully!', 'success');
        setIsNewPurchaseModalOpen(false);
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCancelPurchase = async (purchaseId) => {
    if (!window.confirm('Cancel this purchase order? Product stock will be decremented and financial ledger reversed.')) {
      return;
    }
    try {
      const { data } = await api.post(`/business/purchases/${purchaseId}/cancel`);
      if (data.success) {
        showToast('Purchase Order cancelled successfully', 'success');
        loadData();
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
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>Procurement & Purchases</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Supplier Purchase Orders, Goods Received Notes (GRNs) & Restocking
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsNewPurchaseModalOpen(true)}>
          <Plus size={16} style={{ marginRight: '6px' }} />
          Create Purchase Order
        </Button>
      </div>

      {/* Purchases List Table */}
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px' }}>PO Number</th>
                <th style={{ padding: '12px 16px' }}>Supplier</th>
                <th style={{ padding: '12px 16px' }}>GRN Reference</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center' }}>Loading purchases...</td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.purchase_number}</td>
                    <td style={{ padding: '12px 16px' }}>{p.supplier_name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{p.reference_grn}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>₹{Number(p.total_amount).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: p.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: p.status === 'COMPLETED' ? '#10B981' : '#EF4444',
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <Button size="sm" variant="secondary" onClick={() => setViewingPurchase(p)} title="View Details">
                          <Eye size={14} />
                        </Button>
                        {canCancel && p.status === 'COMPLETED' && (
                          <Button size="sm" variant="secondary" onClick={() => handleCancelPurchase(p.id)} title="Cancel Purchase" style={{ color: '#EF4444' }}>
                            <RotateCcw size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Purchase Order Modal */}
      {isNewPurchaseModalOpen && (
        <Modal isOpen={isNewPurchaseModalOpen} onClose={() => setIsNewPurchaseModalOpen(false)} title="Create Purchase Order & Record GRN">
          <form onSubmit={handleCreatePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Select Supplier</label>
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '13px' }}
              >
                <option value="">Choose Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.contact_name || s.phone || 'Supplier'})</option>
                ))}
              </select>
            </div>

            {/* Line Items */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Line Items to Receive</label>
                <button type="button" onClick={handleAddItemRow} style={{ background: 'none', border: 'none', color: 'var(--color-brand)', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                  + Add Line Item
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {purchaseItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                    <select
                      required
                      value={item.product_id}
                      onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                      style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '12px' }}
                    >
                      <option value="">Select Product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                      ))}
                    </select>

                    <Input
                      type="number"
                      min="1"
                      required
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      style={{ padding: '8px', fontSize: '12px' }}
                    />

                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="Unit Cost (₹)"
                      value={item.unit_cost}
                      onChange={(e) => handleItemChange(idx, 'unit_cost', e.target.value)}
                      style={{ padding: '8px', fontSize: '12px' }}
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      disabled={purchaseItems.length === 1}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', opacity: purchaseItems.length === 1 ? 0.3 : 1 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax & Discount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Tax Rate (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
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
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Payment Mode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '12px' }}
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
            </div>

            {/* Total */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Calculated Grand Total:</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>₹{grandTotal.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsNewPurchaseModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Submit Order & Receive Goods</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Purchase Details Modal */}
      {viewingPurchase && (
        <Modal isOpen={!!viewingPurchase} onClose={() => setViewingPurchase(null)} title={`Purchase Order: ${viewingPurchase.purchase_number}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-surface-hover)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <div><strong>Supplier:</strong> {viewingPurchase.supplier_name}</div>
              <div><strong>GRN:</strong> {viewingPurchase.reference_grn}</div>
              <div><strong>Date:</strong> {new Date(viewingPurchase.created_at).toLocaleString()}</div>
              <div><strong>Payment:</strong> {viewingPurchase.payment_method} ({viewingPurchase.payment_status})</div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>Received Items:</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Item</th>
                    <th style={{ textAlign: 'center', padding: '6px' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Unit Cost</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingPurchase.items?.map((it) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px' }}>{it.product_name}</td>
                      <td style={{ textAlign: 'center', padding: '6px' }}>{it.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '6px' }}>₹{Number(it.unit_cost).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '6px' }}>₹{Number(it.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Order Total:</span>
              <span>₹{Number(viewingPurchase.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Truck,
  Plus,
  Search,
  RotateCcw,
  Eye,
  Building2,
  UserPlus,
  Edit2,
  Phone,
  Mail,
  MapPin,
  X,
  PackageCheck,
  Lock
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';

export default function PurchasesPage({ initialTab }) {
  const { role } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const location = useLocation();
  const navigate = useNavigate();

  // Active view tab: 'orders' | 'suppliers'
  const queryTab = new URLSearchParams(location.search).get('tab');
  const [activeTab, setActiveTab] = useState(initialTab || queryTab || 'orders');

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [poSearch, setPoSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [poPage, setPoPage] = useState(1);
  const [poTotalPages, setPoTotalPages] = useState(1);

  // Create Purchase Order Modal
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([
    { product_id: '', quantity: 1, unit_cost: '' }
  ]);
  const [taxRate, setTaxRate] = useState(5.0);
  const [discountAmount, setDiscountAmount] = useState(0.0);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [isSubmittingPO, setIsSubmittingPO] = useState(false);

  // View Details Modal
  const [viewingPurchase, setViewingPurchase] = useState(null);

  // Supplier Add/Edit Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isQuickAddFromPO, setIsQuickAddFromPO] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);

  const userRole = role ? String(role).toUpperCase() : '';
  const canManage = ['ADMIN', 'OWNER', 'MANAGER'].includes(userRole);
  const canCancel = ['ADMIN', 'OWNER'].includes(userRole);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [purchRes, supRes, prodRes] = await Promise.all([
        api.get(`/business/purchases?page=${poPage}&limit=20`),
        api.get('/business/suppliers'),
        api.get('/inventory/products?limit=100'),
      ]);

      if (purchRes.data.success) {
        setPurchases(purchRes.data.data || []);
        if (purchRes.data.meta) {
          setPoTotalPages(purchRes.data.meta.total_pages || 1);
        }
      }
      if (supRes.data.success) {
        setSuppliers(supRes.data.data || []);
      }
      if (prodRes.data.success) {
        setProducts(prodRes.data.data || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [poPage]);

  // Handle URL tab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (queryTab) {
      setActiveTab(queryTab);
    }
  }, [initialTab, queryTab]);

  // Prefill PO from Replenishment Planner
  useEffect(() => {
    if (location.state?.prefillItem && products.length > 0) {
      const it = location.state.prefillItem;
      if (it.supplier_id) {
        setSelectedSupplierId(it.supplier_id);
      } else if (suppliers.length > 0) {
        setSelectedSupplierId(suppliers[0].id);
      }

      setPurchaseItems([
        {
          product_id: it.product_id,
          quantity: it.quantity || 10,
          unit_cost: it.unit_cost != null ? String(it.unit_cost) : '',
        }
      ]);
      setActiveTab('orders');
      setIsNewPurchaseModalOpen(true);
    }
  }, [location.state, products, suppliers]);

  // Line item handlers
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
              updated.unit_cost = p.cost_price != null ? String(p.cost_price) : '';
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

  // Submit PO
  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      showToast('Please select a supplier', 'error');
      return;
    }
    const validItems = purchaseItems.filter(
      (it) => it.product_id && parseFloat(it.quantity) > 0 && parseFloat(it.unit_cost) > 0
    );
    if (validItems.length === 0) {
      showToast('Please add at least one line item with valid product, quantity, and unit cost', 'error');
      return;
    }

    setIsSubmittingPO(true);
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
        showToast('Purchase Order created and goods received into stock!', 'success');
        setIsNewPurchaseModalOpen(false);
        // Reset form
        setPurchaseItems([{ product_id: '', quantity: 1, unit_cost: '' }]);
        setSelectedSupplierId('');
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingPO(false);
    }
  };

  // Cancel PO
  const handleCancelPurchase = async (purchaseId) => {
    if (!window.confirm('Cancel this purchase order? Product stock will be decremented and financial ledger reversed.')) {
      return;
    }
    try {
      const { data } = await api.post(`/business/purchases/${purchaseId}/cancel`);
      if (data.success) {
        showToast('Purchase Order cancelled and stock ledger reversed successfully', 'success');
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Supplier modal handlers
  const handleOpenSupplierModal = (sup = null, isFromPO = false) => {
    setIsQuickAddFromPO(isFromPO);
    if (sup) {
      setEditingSupplier(sup);
      setSupplierForm({
        name: sup.name || '',
        contact_name: sup.contact_name || '',
        email: sup.email || '',
        phone: sup.phone || '',
        address: sup.address || '',
      });
    } else {
      setEditingSupplier(null);
      setSupplierForm({
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        address: '',
      });
    }
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      showToast('Supplier/Company name is required', 'error');
      return;
    }

    setIsSubmittingSupplier(true);
    try {
      const payload = {
        name: supplierForm.name.trim(),
        contact_name: supplierForm.contact_name.trim() || null,
        email: supplierForm.email.trim() || null,
        phone: supplierForm.phone.trim() || null,
        address: supplierForm.address.trim() || null,
      };

      if (!editingSupplier) {
        const { data } = await api.post('/business/suppliers', payload);
        showToast('Supplier registered successfully', 'success');
        setIsSupplierModalOpen(false);
        // Refresh suppliers list
        const supRes = await api.get('/business/suppliers');
        if (supRes.data.success) {
          setSuppliers(supRes.data.data || []);
        }
        // If opened from PO, select the newly added supplier
        if (isQuickAddFromPO && data.data?.id) {
          setSelectedSupplierId(data.data.id);
        }
      } else {
        await api.put(`/business/suppliers/${editingSupplier.id}`, payload);
        showToast('Supplier updated successfully', 'success');
        setIsSupplierModalOpen(false);
        const supRes = await api.get('/business/suppliers');
        if (supRes.data.success) {
          setSuppliers(supRes.data.data || []);
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  // Switch to PO for a specific supplier
  const handleCreatePOForSupplier = (supplier) => {
    setSelectedSupplierId(supplier.id);
    setActiveTab('orders');
    setIsNewPurchaseModalOpen(true);
  };

  // Filtered lists
  const filteredPurchases = purchases.filter((p) => {
    if (!poSearch) return true;
    const q = poSearch.toLowerCase();
    return (
      p.purchase_number.toLowerCase().includes(q) ||
      (p.supplier_name && p.supplier_name.toLowerCase().includes(q)) ||
      p.reference_grn.toLowerCase().includes(q)
    );
  });

  const filteredSuppliers = suppliers.filter((s) => {
    if (!supplierSearch) return true;
    const q = supplierSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contact_name && s.contact_name.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>Procurement & Suppliers</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Supplier Directory, Goods Received Notes (GRNs), and Automated Stock Restocking
          </p>
        </div>

        {canManage && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => handleOpenSupplierModal()}>
              <Building2 size={16} />
              Add Supplier
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (suppliers.length > 0 && !selectedSupplierId) {
                  setSelectedSupplierId(suppliers[0].id);
                }
                setIsNewPurchaseModalOpen(true);
              }}
            >
              <Plus size={16} />
              Create Purchase Order
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Truck size={16} />
          <span>Purchase Orders & GRNs ({purchases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: activeTab === 'suppliers' ? 'var(--color-brand)' : 'transparent',
            color: activeTab === 'suppliers' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Building2 size={16} />
          <span>Suppliers Directory ({suppliers.length})</span>
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'orders' && (
        <>
          {/* Filter Bar */}
          <Card padding="md">
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <div style={{ flex: '1 1 260px', position: 'relative' }}>
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
                  placeholder="Search by PO number, supplier, or GRN code..."
                  value={poSearch}
                  onChange={(e) => setPoSearch(e.target.value)}
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
            </div>
          </Card>

          {/* Orders Table */}
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
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Loading purchase orders...
                      </td>
                    </tr>
                  ) : filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {poSearch ? 'No purchase orders matching query.' : 'No purchase orders recorded yet. Click "Create Purchase Order" above to restock.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.purchase_number}</td>
                        <td style={{ padding: '12px 16px' }}>{p.supplier_name || 'Primary Supplier'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>
                          {p.reference_grn}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>
                          ₹{Number(p.total_amount).toFixed(2)}
                        </td>
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
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            <Button size="sm" variant="secondary" onClick={() => setViewingPurchase(p)} title="View Order Details">
                              <Eye size={14} />
                            </Button>
                            {canCancel && p.status === 'COMPLETED' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleCancelPurchase(p.id)}
                                title="Cancel Purchase & Reverse Stock"
                                style={{ color: '#EF4444' }}
                              >
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

            {/* Pagination Controls */}
            {poTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Page {poPage} of {poTotalPages}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="sm" disabled={poPage <= 1} onClick={() => setPoPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="secondary" size="sm" disabled={poPage >= poTotalPages} onClick={() => setPoPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* TAB 2: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <>
          {/* Supplier Filter & Actions */}
          <Card padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: '1 1 260px', position: 'relative' }}>
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
                  placeholder="Search suppliers by company name, contact, phone, or email..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
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

              {canManage && (
                <Button variant="primary" onClick={() => handleOpenSupplierModal()}>
                  <UserPlus size={16} />
                  Add New Supplier
                </Button>
              )}
            </div>
          </Card>

          {/* Suppliers Table */}
          <Card padding="none" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px 16px' }}>Company / Supplier Name</th>
                    <th style={{ padding: '12px 16px' }}>Contact Person</th>
                    <th style={{ padding: '12px 16px' }}>Phone</th>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Address</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Loading suppliers directory...
                      </td>
                    </tr>
                  ) : filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {supplierSearch ? 'No suppliers matching query.' : 'No suppliers registered yet. Click "Add New Supplier" to create your first vendor.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Building2 size={16} style={{ color: 'var(--color-brand)', flexShrink: 0 }} />
                            <span>{s.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {s.contact_name || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {s.phone ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} />
                              {s.phone}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {s.email ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={12} />
                              {s.email}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.address ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} />
                              {s.address}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: s.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: s.is_active ? '#10B981' : '#EF4444',
                            }}
                          >
                            {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            {canManage && (
                              <button
                                onClick={() => handleOpenSupplierModal(s)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--bg-surface)',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title="Edit Supplier"
                              >
                                <Edit2 size={13} />
                                Edit
                              </button>
                            )}

                            {canManage && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleCreatePOForSupplier(s)}
                                title="Draft PO for this Supplier"
                              >
                                <Truck size={13} />
                                Draft PO
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
        </>
      )}

      {/* MODAL 1: CREATE PURCHASE ORDER */}
      {isNewPurchaseModalOpen && (
        <Modal
          isOpen={isNewPurchaseModalOpen}
          onClose={() => setIsNewPurchaseModalOpen(false)}
          title="Create Purchase Order & Record GRN"
        >
          <form onSubmit={handleCreatePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Supplier Selector with Quick Add */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Select Supplier *</label>
                <button
                  type="button"
                  onClick={() => handleOpenSupplierModal(null, true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-brand)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={13} />
                  Quick Add Supplier
                </button>
              </div>

              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-root)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              >
                <option value="">Choose Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.contact_name ? `(${s.contact_name})` : ''} {s.phone ? `— ${s.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Line Items */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Line Items to Receive & Restock</label>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-brand)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={13} />
                  Add Line Item
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {purchaseItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 100px 120px 36px',
                      gap: '8px',
                      alignItems: 'center',
                      background: 'var(--bg-surface-hover)',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <select
                      required
                      value={item.product_id}
                      onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                      style={{
                        height: '36px',
                        padding: '0 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-root)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                      }}
                    >
                      <option value="">Select Catalog Product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (SKU: {p.sku}) — Stock: {p.stock_quantity}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      style={{
                        height: '36px',
                        padding: '0 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-root)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        textAlign: 'center',
                      }}
                    />

                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="Cost (₹)"
                      value={item.unit_cost}
                      onChange={(e) => handleItemChange(idx, 'unit_cost', e.target.value)}
                      style={{
                        height: '36px',
                        padding: '0 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-root)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      disabled={purchaseItems.length === 1}
                      title="Remove Row"
                      style={{
                        height: '36px',
                        width: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        cursor: purchaseItems.length === 1 ? 'not-allowed' : 'pointer',
                        opacity: purchaseItems.length === 1 ? 0.3 : 1,
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax, Discount & Payment Method */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-root)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-root)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Payment Mode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-root)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI Payment</option>
                </select>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Items Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>GST / Tax ({taxRate}%):</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              {parseFloat(discountAmount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#EF4444' }}>
                  <span>Discount:</span>
                  <span>-₹{parseFloat(discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)', marginTop: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>Total Payable & Restocked:</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsNewPurchaseModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingPO}>
                <PackageCheck size={16} />
                Submit Order & Receive Goods
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: ADD / EDIT SUPPLIER */}
      {isSupplierModalOpen && (
        <Modal
          isOpen={isSupplierModalOpen}
          onClose={() => setIsSupplierModalOpen(false)}
          title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Register New Vendor / Supplier'}
        >
          <form onSubmit={handleSaveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Input
              label="Supplier / Company Name *"
              required
              value={supplierForm.name}
              onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              placeholder="e.g. Apex Industrial Supplies Pvt Ltd"
            />

            <Input
              label="Contact Person Name"
              value={supplierForm.contact_name}
              onChange={(e) => setSupplierForm({ ...supplierForm, contact_name: e.target.value })}
              placeholder="e.g. Rajesh Sharma"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Phone Number"
                type="tel"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
              />
              <Input
                label="Email Address"
                type="email"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                placeholder="e.g. contact@apexsupplies.com"
              />
            </div>

            <Input
              label="Business Address / Warehouse"
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              placeholder="e.g. Plot 42, GIDC Industrial Area, Ahmedabad, Gujarat"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsSupplierModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingSupplier}>
                <Building2 size={16} />
                {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: VIEW PURCHASE DETAILS & GRN */}
      {viewingPurchase && (
        <Modal
          isOpen={!!viewingPurchase}
          onClose={() => setViewingPurchase(null)}
          title={`Purchase Order: ${viewingPurchase.purchase_number}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-surface-hover)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Supplier</span>
                <div style={{ fontWeight: 700 }}>{viewingPurchase.supplier_name || 'Primary Supplier'}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>GRN Reference</span>
                <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{viewingPurchase.reference_grn}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Receipt Date</span>
                <div>{new Date(viewingPurchase.created_at).toLocaleString()}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Payment Mode</span>
                <div>{viewingPurchase.payment_method} ({viewingPurchase.payment_status})</div>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>Received Inventory Line Items:</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Product</th>
                    <th style={{ textAlign: 'center', padding: '6px' }}>Quantity</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Unit Cost</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingPurchase.items?.map((it) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 600 }}>{it.product_name}</td>
                      <td style={{ textAlign: 'center', padding: '8px 6px' }}>{it.quantity} units</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px' }}>₹{Number(it.unit_cost).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700 }}>₹{Number(it.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Subtotal:</span>
                <span>₹{Number(viewingPurchase.subtotal).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Tax Amount:</span>
                <span>₹{Number(viewingPurchase.tax_amount).toFixed(2)}</span>
              </div>
              {Number(viewingPurchase.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#EF4444' }}>
                  <span>Discount:</span>
                  <span>-₹{Number(viewingPurchase.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)' }}>
                <span>Total Amount:</span>
                <span style={{ color: '#10B981' }}>₹{Number(viewingPurchase.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

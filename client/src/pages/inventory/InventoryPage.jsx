import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  History,
  AlertTriangle,
  Edit2,
  FolderPlus,
  RefreshCw,
  Sparkles,
  Truck,
  ArrowRight,
  TrendingUp,
  Info,
  Trash2,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/feedback/Skeleton';
import api from '../../api/client';

export default function InventoryPage() {
  const { role } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  // Active view tab: 'catalog' | 'categories' | 'replenishment'
  const [activeTab, setActiveTab] = useState('catalog');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [replenishmentPlan, setReplenishmentPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination for Catalog
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyMovements, setHistoryMovements] = useState([]);
  const [historyTargetProduct, setHistoryTargetProduct] = useState(null);

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: 0,
    min_stock_level: 5,
    lead_time_days: 7,
    safety_stock: 10,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    parent_id: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    quantity_delta: 0,
    movement_type: 'ADJUSTMENT',
    reason: '',
  });

  const canManage = ['ADMIN', 'OWNER', 'MANAGER'].includes(role);
  const canDelete = ['ADMIN', 'OWNER'].includes(role);

  const handleDeleteProduct = async (prod) => {
    if (!window.confirm(`Are you sure you want to archive product "${prod.name}" (SKU: ${prod.sku})? It will be deactivated from the catalog.`)) {
      return;
    }
    try {
      const { data } = await api.delete(`/inventory/products/${prod.id}`);
      if (data.success) {
        showToast(`Product "${prod.name}" archived successfully`, 'success');
        loadProducts();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await api.get('/inventory/categories');
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedStatus) params.append('stock_status', selectedStatus);
      params.append('page', page);
      params.append('limit', 15);

      const { data } = await api.get(`/inventory/products?${params.toString()}`);
      if (data.success) {
        setProducts(data.data || []);
        if (data.meta) {
          setTotalPages(data.meta.total_pages);
          setTotalProducts(data.meta.total);
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReplenishmentPlan = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/analytics/replenishment-planner');
      if (data.success) {
        setReplenishmentPlan(data.data);
      }
    } catch (err) {
      showToast('Failed to load replenishment planner', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'catalog') {
      loadProducts();
    } else if (activeTab === 'replenishment') {
      loadReplenishmentPlan();
    }
  }, [page, search, selectedCategory, selectedStatus, activeTab]);

  // Product Modal Open
  const handleOpenProductModal = (prod = null) => {
    if (prod) {
      setEditingProduct(prod);
      setProductForm({
        name: prod.name,
        sku: prod.sku,
        category_id: prod.category_id || '',
        cost_price: prod.cost_price,
        selling_price: prod.selling_price,
        stock_quantity: prod.stock_quantity,
        min_stock_level: prod.min_stock_level,
        lead_time_days: prod.lead_time_days || 7,
        safety_stock: prod.safety_stock || 10,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        sku: '',
        category_id: categories.length > 0 ? categories[0].id : '',
        cost_price: '',
        selling_price: '',
        stock_quantity: 0,
        min_stock_level: 5,
        lead_time_days: 7,
        safety_stock: 10,
      });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.category_id) {
      showToast('Please select a product category', 'error');
      return;
    }
    try {
      const payload = {
        name: productForm.name.trim(),
        sku: productForm.sku.trim(),
        category_id: productForm.category_id,
        cost_price: parseFloat(productForm.cost_price),
        selling_price: parseFloat(productForm.selling_price),
        min_stock_level: parseInt(productForm.min_stock_level, 10),
        lead_time_days: parseInt(productForm.lead_time_days, 10),
        safety_stock: parseInt(productForm.safety_stock, 10),
      };

      if (!editingProduct) {
        payload.stock_quantity = parseInt(productForm.stock_quantity, 10);
        await api.post('/inventory/products', payload);
        showToast('Product created successfully', 'success');
      } else {
        await api.put(`/inventory/products/${editingProduct.id}`, payload);
        showToast('Product updated successfully', 'success');
      }

      setIsProductModalOpen(false);
      loadProducts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Stock Adjustment
  const handleOpenAdjust = (prod) => {
    setAdjustTargetProduct(prod);
    setAdjustForm({
      quantity_delta: 0,
      movement_type: 'ADJUSTMENT',
      reason: '',
    });
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjust = async (e) => {
    e.preventDefault();
    if (adjustForm.quantity_delta === 0) {
      showToast('Quantity delta cannot be zero', 'error');
      return;
    }
    try {
      await api.post(`/inventory/products/${adjustTargetProduct.id}/adjust-stock`, {
        quantity_delta: parseInt(adjustForm.quantity_delta, 10),
        movement_type: adjustForm.movement_type,
        reason: adjustForm.reason,
      });
      showToast('Stock adjusted successfully', 'success');
      setIsAdjustModalOpen(false);
      loadProducts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // History Drawer
  const handleOpenHistory = async (prod) => {
    setHistoryTargetProduct(prod);
    setIsHistoryOpen(true);
    try {
      const { data } = await api.get(`/inventory/movements?product_id=${prod.id}`);
      if (data.success) {
        setHistoryMovements(data.data || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Create PO from Replenishment Item
  const handleOrderReplenishment = (item) => {
    navigate('/purchases', {
      state: {
        prefillItem: {
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          quantity: item.recommended_order_quantity || 10,
          unit_cost: item.unit_cost_price,
          supplier_id: item.preferred_supplier_id
        }
      }
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'IN_STOCK':
        return <Badge variant="success">In stock</Badge>;
      case 'LOW_STOCK':
        return <Badge variant="warning">Low stock</Badge>;
      case 'OUT_OF_STOCK':
      default:
        return <Badge variant="danger">Out of stock</Badge>;
    }
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'CRITICAL':
        return <span style={{ background: '#EF4444', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>CRITICAL (STOCKOUT)</span>;
      case 'HIGH':
        return <span style={{ background: '#F59E0B', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>HIGH PRIORITY</span>;
      case 'MODERATE':
        return <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>REORDER NOW</span>;
      default:
        return <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>OPTIMAL</span>;
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Page Header */}
      <div className="page-head">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="page-sub">
            {totalProducts} products across {categories.length} categories, with live stock balances.
          </p>
        </div>

        {canManage && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => setIsCategoryModalOpen(true)}>
              <FolderPlus size={16} style={{ marginRight: '6px' }} />
              Add Category
            </Button>
            <Button variant="primary" onClick={() => handleOpenProductModal()}>
              <Plus size={16} style={{ marginRight: '6px' }} />
              Add Product
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="tabs" role="tablist" aria-label="Stock views">
        <button
          role="tab"
          aria-selected={activeTab === 'catalog'}
          onClick={() => setActiveTab('catalog')}
          className={`tab${activeTab === 'catalog' ? ' is-current' : ''}`}
        >
          <Package size={15} aria-hidden="true" />
          <span>Products</span>
          <span className="tab-count">{totalProducts}</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'categories'}
          onClick={() => setActiveTab('categories')}
          className={`tab${activeTab === 'categories' ? ' is-current' : ''}`}
        >
          <FolderPlus size={15} aria-hidden="true" />
          <span>Categories</span>
          <span className="tab-count">{categories.length}</span>
        </button>

        {canManage && (
          <button
            role="tab"
            aria-selected={activeTab === 'replenishment'}
            onClick={() => setActiveTab('replenishment')}
            className={`tab${activeTab === 'replenishment' ? ' is-current' : ''}`}
          >
            <Sparkles size={15} aria-hidden="true" />
            <span>Replenishment</span>
            {replenishmentPlan?.total_reorder_items_count > 0 && (
              <span className="tab-count">{replenishmentPlan.total_reorder_items_count} to reorder</span>
            )}
          </button>
        )}
      </div>

      {/* TAB 1: CATALOG PRODUCTS */}
      {activeTab === 'catalog' && (
        <>
          {/* Filter Bar */}
          <Card padding="md">
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 240px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search products by name, SKU or barcode..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-root)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                  }}
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-root)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-root)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <option value="">All Stock Levels</option>
                <option value="IN_STOCK">Normal Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </Card>

          {/* Catalog Table */}
          <Card padding="none">
            {isLoading ? (
              <div style={{ padding: 'var(--space-6)' }}>
                <Skeleton variant="rectangular" height="240px" />
              </div>
            ) : products.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No products found matching filters.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>SKU & Name</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Cost Price</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Selling Price</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Stock on Hand</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((prod) => (
                      <tr key={prod.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prod.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{prod.sku}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {prod.category_name || prod.category?.name || 'General'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {['ADMIN', 'OWNER', 'MANAGER'].includes(role) ? `₹${parseFloat(prod.cost_price).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                          ₹{parseFloat(prod.selling_price).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: prod.stock_quantity <= prod.min_stock_level ? '#EF4444' : 'inherit' }}>
                            {prod.stock_quantity}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                            (min: {prod.min_stock_level})
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {getStatusBadge(prod.stock_status || prod.status)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            {canManage && (
                              <button
                                onClick={() => handleOpenAdjust(prod)}
                                style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Adjust Stock"
                              >
                                <SlidersHorizontal size={13} />
                                Adjust
                              </button>
                            )}

                            {canManage && (
                              <button
                                onClick={() => handleOpenHistory(prod)}
                                style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Stock Movement History"
                              >
                                <History size={13} />
                                Movements
                              </button>
                            )}

                            {canManage && (
                              <button
                                onClick={() => handleOpenProductModal(prod)}
                                style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Edit Product"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                onClick={() => handleDeleteProduct(prod)}
                                style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', cursor: 'pointer', color: '#EF4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Archive Product"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Page {page} of {totalPages}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <Card padding="none">
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Catalog Hierarchical Categories</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Organize business products for reporting and tax segmentation</p>
            </div>
            {canManage && (
              <Button size="sm" variant="primary" onClick={() => setIsCategoryModalOpen(true)}>
                <FolderPlus size={14} style={{ marginRight: '4px' }} />
                New Category
              </Button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {c.description || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: SMART REPLENISHMENT PLANNER (USP 4.1) */}
      {activeTab === 'replenishment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Planner Summary Banner */}
          <Card padding="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} style={{ color: 'var(--color-brand)' }} />
                  <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, margin: 0 }}>
                    Deterministic Replenishment Planner
                  </h2>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Evaluates 30-day velocity, supplier lead times, and safety buffers using formula:
                  <code style={{ marginLeft: '6px', padding: '2px 6px', background: 'var(--bg-root)', borderRadius: '4px', fontSize: '11px', color: 'var(--color-brand)' }}>
                    ROP = (30-day Avg Daily Sales × Lead Time in Days) + Safety Stock
                  </code>
                </p>
              </div>

              {replenishmentPlan && (
                <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Items to Reorder</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#EF4444' }}>
                      {replenishmentPlan.total_reorder_items_count}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Est. Replenishment Cost</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      ₹{Number(replenishmentPlan.total_estimated_replenishment_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Replenishment Table */}
          <Card padding="none">
            {isLoading ? (
              <div style={{ padding: 'var(--space-6)' }}>
                <Skeleton variant="rectangular" height="260px" />
              </div>
            ) : !replenishmentPlan || replenishmentPlan.items.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No active inventory products to evaluate.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Product & SKU</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Stock</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Daily Velocity</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Lead Time</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Calculated ROP</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Rec. Order Qty</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Preferred Supplier</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Urgency</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {replenishmentPlan.items.map((it) => (
                      <tr key={it.product_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{it.product_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{it.sku}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: it.current_stock <= it.reorder_point ? '#EF4444' : 'inherit' }}>
                            {it.current_stock}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {it.avg_daily_usage} / day
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {it.lead_time_days} days
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-brand)' }}>
                          {it.reorder_point}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {it.recommended_order_quantity > 0 ? (
                            <span style={{ fontWeight: 700, color: '#EF4444', fontSize: '13px' }}>
                              +{it.recommended_order_quantity} units
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {it.preferred_supplier_name || 'Primary Supplier'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {getUrgencyBadge(it.urgency)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {it.recommended_order_quantity > 0 && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOrderReplenishment(it)}
                            >
                              <Truck size={13} style={{ marginRight: '4px' }} />
                              Draft PO
                            </Button>
                          )}
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

      {/* MODAL 1: ADD/EDIT PRODUCT */}
      {isProductModalOpen && (
        <Modal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title={editingProduct ? 'Edit Catalog SKU' : 'Register New Catalog SKU'}
        >
          <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Input
              label="Product Name"
              required
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              placeholder="e.g. Wireless Barcode Scanner"
            />
            <Input
              label="SKU Code (Unique)"
              required
              disabled={!!editingProduct}
              value={productForm.sku}
              onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
              placeholder="e.g. ELEC-WBS-001"
            />
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Category *
              </label>
              <select
                required
                value={productForm.category_id}
                onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)', fontSize: '13px' }}
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Cost Price (₹)"
                type="number"
                step="0.01"
                min="0"
                required
                value={productForm.cost_price}
                onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
              />
              <Input
                label="Selling Price (₹)"
                type="number"
                step="0.01"
                min="0"
                required
                value={productForm.selling_price}
                onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
              />
            </div>
            {!editingProduct && (
              <Input
                label="Initial Stock Quantity"
                type="number"
                min="0"
                required
                value={productForm.stock_quantity}
                onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
              />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <Input
                label="Min Stock Alert"
                type="number"
                min="0"
                required
                value={productForm.min_stock_level}
                onChange={(e) => setProductForm({ ...productForm, min_stock_level: e.target.value })}
              />
              <Input
                label="Lead Time (Days)"
                type="number"
                min="1"
                required
                value={productForm.lead_time_days}
                onChange={(e) => setProductForm({ ...productForm, lead_time_days: e.target.value })}
              />
              <Input
                label="Safety Stock"
                type="number"
                min="0"
                required
                value={productForm.safety_stock}
                onChange={(e) => setProductForm({ ...productForm, safety_stock: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsProductModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">{editingProduct ? 'Save Changes' : 'Create Product'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: ADD CATEGORY */}
      {isCategoryModalOpen && (
        <Modal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          title="Create Product Category"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = {
                  name: categoryForm.name.trim(),
                  description: categoryForm.description ? categoryForm.description.trim() : null,
                  parent_id: categoryForm.parent_id || null,
                };
                await api.post('/inventory/categories', payload);
                showToast('Category created successfully', 'success');
                setIsCategoryModalOpen(false);
                setCategoryForm({ name: '', description: '', parent_id: '' });
                loadCategories();
              } catch (err) {
                showToast(err.message, 'error');
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
          >
            <Input
              label="Category Name"
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="e.g. POS Hardware & Accessories"
            />
            <Input
              label="Description (Optional)"
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              placeholder="Brief details about product category..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Create Category</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: ADJUST STOCK */}
      {isAdjustModalOpen && adjustTargetProduct && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title={`Adjust Stock: ${adjustTargetProduct.name}`}
        >
          <form onSubmit={handleSaveAdjust} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ padding: '10px', background: 'var(--bg-root)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
              <div>Current On-Hand Balance: <strong>{adjustTargetProduct.stock_quantity} units</strong></div>
            </div>
            <Input
              label="Quantity Delta (positive to add, negative to deduct)"
              type="number"
              required
              value={adjustForm.quantity_delta}
              onChange={(e) => setAdjustForm({ ...adjustForm, quantity_delta: e.target.value })}
              placeholder="e.g. +10 or -3"
            />
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Movement Reason Code
              </label>
              <select
                value={adjustForm.movement_type}
                onChange={(e) => setAdjustForm({ ...adjustForm, movement_type: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
              >
                <option value="ADJUSTMENT">Stock Audit / Manual Adjustment</option>
                <option value="RETURN">Customer Return Restock</option>
              </select>
            </div>
            <Input
              label="Audit Justification Note"
              required
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              placeholder="e.g. Physical inventory count variance reconciliation"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsAdjustModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Commit Adjustment</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DRAWER: MOVEMENT AUDIT HISTORY */}
      {isHistoryOpen && historyTargetProduct && (
        <Modal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          title={`Stock Movement History: ${historyTargetProduct.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {historyMovements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No movement records logged for this product.
              </div>
            ) : (
              historyMovements.map((m) => (
                <div key={m.id} style={{ padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-root)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.movement_type}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {m.reason || 'No description'} | Ref: {m.reference_id || 'N/A'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: (m.quantity != null ? m.quantity : m.quantity_change) > 0 ? '#10B981' : '#EF4444' }}>
                      {(m.quantity != null ? m.quantity : m.quantity_change) > 0 ? `+${m.quantity != null ? m.quantity : m.quantity_change}` : (m.quantity != null ? m.quantity : m.quantity_change)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      New Stock: {m.new_stock != null ? m.new_stock : m.new_balance} units
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      Prev: {m.previous_stock != null ? m.previous_stock : '—'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

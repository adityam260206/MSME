import { useState, useEffect, useContext } from 'react';
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

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
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
      params.append('limit', 20);

      const { data } = await api.get(`/inventory/products?${params.toString()}`);
      if (data.success) {
        setProducts(data.data || []);
        if (data.meta) {
          setTotalPages(data.meta.total_pages);
          setTotalProducts(data.meta.total);
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch inventory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search, selectedCategory, selectedStatus, page]);

  // Product Create/Edit
  const handleOpenProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        sku: product.sku,
        category_id: product.category_id,
        cost_price: product.cost_price || '',
        selling_price: product.selling_price || '',
        stock_quantity: product.stock_quantity,
        min_stock_level: product.min_stock_level,
        lead_time_days: product.lead_time_days,
        safety_stock: product.safety_stock,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        sku: '',
        category_id: categories[0]?.id || '',
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
    try {
      if (editingProduct) {
        await api.put(`/inventory/products/${editingProduct.id}`, {
          name: productForm.name,
          category_id: productForm.category_id,
          cost_price: parseFloat(productForm.cost_price),
          selling_price: parseFloat(productForm.selling_price),
          min_stock_level: parseInt(productForm.min_stock_level, 10),
          lead_time_days: parseInt(productForm.lead_time_days, 10),
          safety_stock: parseInt(productForm.safety_stock, 10),
        });
        showToast('Product updated successfully', 'success');
      } else {
        await api.post('/inventory/products', {
          ...productForm,
          cost_price: parseFloat(productForm.cost_price),
          selling_price: parseFloat(productForm.selling_price),
          stock_quantity: parseInt(productForm.stock_quantity, 10),
          min_stock_level: parseInt(productForm.min_stock_level, 10),
          lead_time_days: parseInt(productForm.lead_time_days, 10),
          safety_stock: parseInt(productForm.safety_stock, 10),
        });
        showToast('Product created successfully', 'success');
      }
      setIsProductModalOpen(false);
      loadProducts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Category Create
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/categories', {
        name: categoryForm.name,
        description: categoryForm.description || null,
        parent_id: categoryForm.parent_id || null,
      });
      showToast('Category created successfully', 'success');
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '', description: '', parent_id: '' });
      loadCategories();
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

  // Stock Movements History
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'IN_STOCK':
        return <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>IN STOCK</span>;
      case 'LOW_STOCK':
        return <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>LOW STOCK</span>;
      case 'OUT_OF_STOCK':
      default:
        return <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>OUT OF STOCK</span>;
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>Inventory & Catalog</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Multi-Tenant Product Catalog, Stock Balances & Immutable Ledger ({totalProducts} SKUs)
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

      {/* Filter Bar */}
      <Card padding="sm">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
            <Input
              type="text"
              placeholder="Search by SKU or Product Name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: '32px' }}
            />
          </div>

          <div style={{ width: '180px' }}>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '13px', color: 'var(--text-primary)' }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ width: '160px' }}>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '13px', color: 'var(--text-primary)' }}
            >
              <option value="">All Stock Status</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          <Button variant="secondary" onClick={() => loadProducts()} title="Refresh">
            <RefreshCw size={14} />
          </Button>
        </div>
      </Card>

      {/* Catalog Table */}
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px' }}>Product & SKU</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                {role !== 'STAFF' && <th style={{ padding: '12px 16px', textAlign: 'right' }}>Cost Price</th>}
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Selling Price</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Stock Qty</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={role !== 'STAFF' ? 7 : 6} style={{ padding: '32px', textAlign: 'center' }}>
                    Loading catalog items...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={role !== 'STAFF' ? 7 : 6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>SKU: {p.sku}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.category_name}</span>
                    </td>
                    {role !== 'STAFF' && (
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>
                        ₹{Number(p.cost_price || 0).toFixed(2)}
                      </td>
                    )}
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#10B981' }}>
                      ₹{Number(p.selling_price).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{p.stock_quantity}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Min: {p.min_stock_level}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {getStatusBadge(p.stock_status)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {canManage && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenAdjust(p)}
                              title="Adjust Stock"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                            >
                              <SlidersHorizontal size={14} style={{ marginRight: '4px' }} />
                              Adjust
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenProductModal(p)}
                              title="Edit Attributes"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                            >
                              <Edit2 size={14} />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenHistory(p)}
                          title="Movement History"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          <History size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add New Product'}>
          <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Product Name</label>
              <Input
                type="text"
                required
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="e.g. Wireless Barcode Scanner"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>SKU Code</label>
                <Input
                  type="text"
                  required
                  disabled={!!editingProduct}
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="e.g. ELEC-WBS-001"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Category</label>
                <select
                  required
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '13px' }}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Cost Price (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={productForm.cost_price}
                  onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                  placeholder="Acquisition cost"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Selling Price (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={productForm.selling_price}
                  onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                  placeholder="Retail selling price"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {!editingProduct && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Opening Stock</label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Min Stock Alert</label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={productForm.min_stock_level}
                  onChange={(e) => setProductForm({ ...productForm, min_stock_level: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Lead Time (Days)</label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={productForm.lead_time_days}
                  onChange={(e) => setProductForm({ ...productForm, lead_time_days: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsProductModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Product</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Add Product Category">
          <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Category Name</label>
              <Input
                type="text"
                required
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g. Electrical Components"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Description</label>
              <Input
                type="text"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Parent Category (Optional)</label>
              <select
                value={categoryForm.parent_id}
                onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '13px' }}
              >
                <option value="">None (Top-Level Category)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Create Category</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && adjustTargetProduct && (
        <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title={`Manual Stock Adjustment: ${adjustTargetProduct.name}`}>
          <form onSubmit={handleSaveAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--bg-surface-hover)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
              Current Physical Stock: <strong>{adjustTargetProduct.stock_quantity} units</strong> (SKU: {adjustTargetProduct.sku})
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Stock Delta (+ to increase, - to decrease)
              </label>
              <Input
                type="number"
                required
                value={adjustForm.quantity_delta}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity_delta: e.target.value })}
                placeholder="e.g. +5 or -2"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Resulting stock will be: {adjustTargetProduct.stock_quantity + parseInt(adjustForm.quantity_delta || 0, 10)} units
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Audit Reason</label>
              <Input
                type="text"
                required
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="e.g. Physical inventory count discrepancy, damaged goods"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsAdjustModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Apply Adjustment</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Movement History Modal */}
      {isHistoryOpen && historyTargetProduct && (
        <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title={`Movement History: ${historyTargetProduct.name}`}>
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {historyMovements.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No movement history found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Date/Time</th>
                    <th style={{ padding: '8px' }}>Type</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Change</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Balance</th>
                    <th style={{ padding: '8px' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {historyMovements.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{new Date(m.created_at).toLocaleString()}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '11px', color: m.movement_type === 'SALE' ? '#EF4444' : '#10B981' }}>
                          {m.movement_type}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: m.quantity > 0 ? '#10B981' : '#EF4444' }}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {m.previous_stock} → <strong>{m.new_stock}</strong>
                      </td>
                      <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{m.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

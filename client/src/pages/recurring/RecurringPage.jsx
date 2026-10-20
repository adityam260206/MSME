import { useEffect, useState, useContext } from 'react';
import { format } from 'date-fns';
import { recurringApi } from '../../api/recurring.api';
import { accountsApi } from '../../api/accounts.api';
import useApi from '../../hooks/useApi';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';

import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/feedback/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import RecurringFormModal from './RecurringFormModal';
import './RecurringPage.css';

export default function RecurringPage() {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const listApi = useApi(recurringApi.getAll);
  const getAccApi = useApi(accountsApi.getAll);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    listApi.execute();
    getAccApi.execute();
  };

  const handleOpenNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (id) => {
    try {
      await recurringApi.toggleStatus(id);
      showToast('Status updated successfully', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recurring schedule?')) return;
    try {
      await recurringApi.delete(id);
      showToast('Schedule deleted successfully', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete schedule', 'error');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingItem) {
        await recurringApi.update(editingItem._id, formData);
        showToast('Schedule updated successfully', 'success');
      } else {
        await recurringApi.create(formData);
        showToast('Schedule created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save schedule', 'error');
    }
  };

  const formatCurrency = (val) => `${user?.currency || '₹'} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recurring Transactions</h1>
          <p className="page-subtitle">Manage your automated income and expenses</p>
        </div>
        <div className="recurring-header-actions">
          <Button variant="primary" onClick={handleOpenNew}>
            + New Schedule
          </Button>
        </div>
      </div>

      {listApi.isLoading ? (
        <div className="recurring-grid">
          {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height="220px" />)}
        </div>
      ) : listApi.error ? (
        <EmptyState title="Failed to load data" description="Please try again later." icon="⚠️" />
      ) : listApi.data?.data?.length > 0 ? (
        <div className="recurring-grid">
          {listApi.data.data.map(item => (
            <Card 
              key={item._id} 
              padding="lg" 
              className={`recurring-card ${item.status === 'paused' ? 'is-paused' : ''}`}
            >
              <div className="recurring-card-header">
                <div>
                  <h3 className="recurring-card-title">{item.name}</h3>
                  <div className="recurring-card-category">
                    {item.category?.icon} {item.category?.name}
                  </div>
                </div>
                <div className="recurring-card-amount" style={{ color: item.type === 'income' ? 'var(--color-success)' : 'var(--text-primary)' }}>
                  {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                </div>
              </div>

              <div className="recurring-card-body">
                <div className="recurring-detail-row">
                  <span className="recurring-detail-label">Frequency</span>
                  <span className="recurring-detail-value">{item.frequency}</span>
                </div>
                <div className="recurring-detail-row">
                  <span className="recurring-detail-label">Next Due</span>
                  <span className="recurring-detail-value">
                    {format(new Date(item.nextDueDate), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="recurring-detail-row">
                  <span className="recurring-detail-label">Status</span>
                  <Badge variant={item.status === 'active' ? 'success' : 'warning'}>
                    {item.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="recurring-card-footer">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleToggleStatus(item._id)}
                >
                  {item.status === 'active' ? 'Pause' : 'Resume'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(item)}>
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(item._id)} 
                  style={{ color: 'var(--color-danger)' }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState 
          title="No recurring schedules" 
          description="Create a schedule to automate your bills or salary." 
          icon="⏳"
          action={<Button variant="primary" onClick={handleOpenNew}>Create Schedule</Button>}
        />
      )}

      {isModalOpen && (
        <RecurringFormModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingItem}
          accounts={getAccApi.data?.data || []}
        />
      )}
    </div>
  );
}

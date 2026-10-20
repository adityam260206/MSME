import { useEffect, useState, useContext } from 'react';
import { accountsApi } from '../../api/accounts.api';
import useApi from '../../hooks/useApi';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';

import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/feedback/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import AccountFormModal from './AccountFormModal';
import TransferFormModal from './TransferFormModal';
import './AccountsPage.css';

export default function AccountsPage() {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const listApi = useApi(accountsApi.getAll);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    listApi.execute();
  };

  const handleOpenNew = () => {
    setEditingItem(null);
    setIsAccountModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsAccountModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this account? You cannot delete an account that has transactions linked to it.')) return;
    try {
      await accountsApi.delete(id);
      showToast('Account deleted successfully', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete account', 'error');
    }
  };

  const handleAccountSubmit = async (formData) => {
    try {
      if (editingItem) {
        await accountsApi.update(editingItem._id, formData);
        showToast('Account updated successfully', 'success');
      } else {
        await accountsApi.create(formData);
        showToast('Account created successfully', 'success');
      }
      setIsAccountModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save account', 'error');
    }
  };

  const handleTransferSubmit = async (formData) => {
    try {
      await accountsApi.transfer(formData);
      showToast('Transfer completed successfully', 'success');
      setIsTransferModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to transfer funds', 'error');
    }
  };

  const formatCurrency = (val) => `${user?.currency || '₹'} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const totalBalance = listApi.data?.data?.reduce((sum, acc) => sum + acc.currentBalance, 0) || 0;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounts</h1>
          <p className="page-subtitle">Total Balance: {formatCurrency(totalBalance)}</p>
        </div>
        <div className="accounts-header-actions">
          <Button variant="ghost" onClick={() => setIsTransferModalOpen(true)}>
            🔄 Transfer Funds
          </Button>
          <Button variant="primary" onClick={handleOpenNew}>
            + New Account
          </Button>
        </div>
      </div>

      {listApi.isLoading ? (
        <div className="accounts-grid">
          {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height="200px" />)}
        </div>
      ) : listApi.error ? (
        <EmptyState title="Failed to load data" description="Please try again later." icon="⚠️" />
      ) : listApi.data?.data?.length > 0 ? (
        <div className="accounts-grid">
          {listApi.data.data.map(account => (
            <Card key={account._id} className="account-card">
              <div className="account-card-accent" style={{ backgroundColor: account.color }} />
              
              <div className="account-header" style={{ padding: '0 var(--space-4)' }}>
                <div className="account-title-group">
                  <h3 className="account-title">{account.name}</h3>
                  <span className="account-type">{account.type}</span>
                </div>
              </div>

              <div className="account-balance-group" style={{ padding: '0 var(--space-4)' }}>
                <div className="account-balance-label">Available Balance</div>
                <div className="account-balance">{formatCurrency(account.currentBalance)}</div>
              </div>

              <div className="account-footer" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(account)}>
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(account._id)} 
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
          title="No Accounts Found" 
          description="Create your first account to start tracking balances." 
          icon="🏦"
          action={<Button variant="primary" onClick={handleOpenNew}>Create Account</Button>}
        />
      )}

      {isAccountModalOpen && (
        <AccountFormModal 
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          onSubmit={handleAccountSubmit}
          initialData={editingItem}
        />
      )}

      {isTransferModalOpen && (
        <TransferFormModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          onSubmit={handleTransferSubmit}
          accounts={listApi.data?.data || []}
        />
      )}
    </div>
  );
}

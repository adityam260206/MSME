import { useState, useEffect, useContext } from 'react';
import { format } from 'date-fns';
import { transactionsApi } from '../../api/transactions.api';
import { categoriesApi } from '../../api/categories.api';
import { accountsApi } from '../../api/accounts.api';
import useApi from '../../hooks/useApi';
import usePagination from '../../hooks/usePagination';
import { ToastContext } from '../../context/ToastContext';
import { AuthContext } from '../../context/AuthContext';
import Table from '../../components/data-display/Table';
import Pagination from '../../components/data-display/Pagination';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/feedback/EmptyState';
import TransactionForm from './TransactionForm';
import './TransactionsPage.css';

export default function TransactionsPage() {
  const { showToast } = useContext(ToastContext);
  const { user } = useContext(AuthContext);
  
  // Data hooks
  const getTxApi = useApi(transactionsApi.getAll);
  const getCatApi = useApi(categoriesApi.getAll);
  const getAccApi = useApi(accountsApi.getAll);
  
  // State
  const pagination = usePagination(1, 10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data
  useEffect(() => {
    getCatApi.execute();
    getAccApi.execute();
  }, []); // Only load categories and accounts once

  useEffect(() => {
    getTxApi.execute({
      page: pagination.page,
      limit: pagination.limit
    });
  }, [pagination.page]); // Reload transactions on page change

  const handleOpenNew = () => {
    setEditingRow(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditingRow(row);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await transactionsApi.delete(id);
      showToast('Transaction deleted');
      // Reload current page
      getTxApi.execute({ page: pagination.page, limit: pagination.limit });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingRow) {
        await transactionsApi.update(editingRow._id, formData);
        showToast('Transaction updated', 'success');
      } else {
        await transactionsApi.create(formData);
        showToast('Transaction added', 'success');
      }
      setIsModalOpen(false);
      // Reload current page
      getTxApi.execute({ page: pagination.page, limit: pagination.limit });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => format(new Date(row.date), 'MMM dd, yyyy')
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <div className="tx-category-cell">
          <span className="tx-icon" style={{ backgroundColor: row.category?.color + '20' }}>
            {row.category?.icon || '📦'}
          </span>
          <span>{row.category?.name || 'Uncategorized'}</span>
        </div>
      )
    },
    {
      key: 'account',
      header: 'Account',
      render: (row) => {
        // Display account name if populated, otherwise lookup from list
        if (row.account?.name) return row.account.name;
        const acc = getAccApi.data?.data?.find(a => a._id === row.account);
        return acc ? acc.name : <span className="text-muted">—</span>;
      }
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => row.description || <span className="text-muted">—</span>
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span className={`tx-amount ${row.type === 'income' ? 'text-success' : ''}`}>
          {row.type === 'income' ? '+' : '-'} {user?.currency || '₹'} {row.amount.toFixed(2)}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '100px',
      render: (row) => (
        <div className="tx-actions">
          <button className="tx-action-btn" onClick={() => handleOpenEdit(row)}>✏️</button>
          <button className="tx-action-btn tx-delete-btn" onClick={() => handleDelete(row._id)}>🗑️</button>
        </div>
      )
    }
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Manage your income and expenses</p>
        </div>
        <Button onClick={handleOpenNew}>
          + Add Transaction
        </Button>
      </div>

      <div className="tx-table-wrapper">
        <Table
          columns={columns}
          data={getTxApi.data?.data}
          isLoading={getTxApi.isLoading}
          emptyState={
            <EmptyState 
              icon="💸"
              title="No transactions yet"
              description="Record your first income or expense to get started."
              action={<Button onClick={handleOpenNew}>Add Transaction</Button>}
            />
          }
        />
        
        {getTxApi.data?.meta && getTxApi.data.meta.totalPages > 1 && (
          <Pagination
            currentPage={getTxApi.data.meta.page}
            totalPages={getTxApi.data.meta.totalPages}
            hasNextPage={getTxApi.data.meta.hasNextPage}
            hasPrevPage={getTxApi.data.meta.hasPrevPage}
            onNext={pagination.nextPage}
            onPrev={pagination.prevPage}
          />
        )}
      </div>

      <TransactionForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        categories={getCatApi.data?.categories}
        accounts={getAccApi.data?.data || []}
        initialData={editingRow}
        isLoading={isSubmitting}
      />
    </div>
  );
}

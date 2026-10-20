import { useState, useEffect, useContext } from 'react';
import { budgetsApi } from '../../api/budgets.api';
import { categoriesApi } from '../../api/categories.api';
import useApi from '../../hooks/useApi';
import { ToastContext } from '../../context/ToastContext';
import { AuthContext } from '../../context/AuthContext';

import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/feedback/EmptyState';
import Skeleton from '../../components/feedback/Skeleton';
import BudgetForm from './BudgetForm';
import './BudgetsPage.css';

export default function BudgetsPage() {
  const { showToast } = useContext(ToastContext);
  const { user } = useContext(AuthContext);
  
  // Start with current month
  const [currentPeriod, setCurrentPeriod] = useState(
    new Date().toISOString().substring(0, 7)
  );

  const getBudgetsApi = useApi(budgetsApi.getAll);
  const getCatApi = useApi(categoriesApi.getAll);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getCatApi.execute();
  }, []);

  useEffect(() => {
    getBudgetsApi.execute(currentPeriod);
  }, [currentPeriod]);

  const handleOpenNew = () => {
    setEditingRow(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (budget) => {
    setEditingRow(budget);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    
    try {
      await budgetsApi.delete(id);
      showToast('Budget deleted');
      getBudgetsApi.execute(currentPeriod);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingRow) {
        await budgetsApi.update(editingRow._id, { amount: formData.amount });
        showToast('Budget updated', 'success');
      } else {
        await budgetsApi.create(formData);
        showToast('Budget created', 'success');
      }
      setIsModalOpen(false);
      getBudgetsApi.execute(currentPeriod);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val) => `${user?.currency || '₹'} ${val?.toFixed(2)}`;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-subtitle">Track spending limits per category</p>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <input 
            type="month" 
            className="period-selector"
            value={currentPeriod}
            onChange={(e) => setCurrentPeriod(e.target.value)}
          />
          <Button onClick={handleOpenNew}>
            + Set Budget
          </Button>
        </div>
      </div>

      {getBudgetsApi.isLoading ? (
        <div className="budgets-grid">
          <Skeleton variant="rectangular" height="150px" />
          <Skeleton variant="rectangular" height="150px" />
        </div>
      ) : getBudgetsApi.data?.budgets?.length > 0 ? (
        <div className="budgets-grid">
          {getBudgetsApi.data.budgets.map(budget => (
            <Card key={budget._id} className="budget-card" padding="lg">
              <div className="budget-header">
                <div className="budget-cat">
                  <span className="tx-icon" style={{ backgroundColor: budget.category.color + '20' }}>
                    {budget.category.icon}
                  </span>
                  <span style={{ fontWeight: 600 }}>{budget.category.name}</span>
                </div>
                
                <div className="budget-actions">
                  <button onClick={() => handleOpenEdit(budget)}>✏️</button>
                  <button onClick={() => handleDelete(budget._id)}>🗑️</button>
                </div>
              </div>

              <div className="budget-amounts">
                <span className="budget-spent">{formatCurrency(budget.spent)}</span>
                <span className="budget-limit">of {formatCurrency(budget.amount)}</span>
              </div>

              {/* Progress Bar */}
              <div className="progress-bg">
                <div 
                  className={`progress-fill ${budget.isExceeded ? 'progress-exceeded' : ''}`} 
                  style={{ 
                    width: `${budget.progress}%`,
                    backgroundColor: budget.isExceeded ? 'var(--color-danger)' : budget.category.color 
                  }}
                />
              </div>
              
              {budget.isExceeded && (
                <div className="budget-warning">
                  ⚠️ Over budget by {formatCurrency(budget.spent - budget.amount)}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState 
          icon="🎯"
          title="No budgets set for this month"
          description="Set spending limits to keep your expenses in check."
          action={<Button onClick={handleOpenNew}>Set a Budget</Button>}
        />
      )}

      <BudgetForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        categories={getCatApi.data?.categories}
        initialData={editingRow}
        isLoading={isSubmitting}
      />
    </div>
  );
}

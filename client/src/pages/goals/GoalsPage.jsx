import { useEffect, useState, useContext } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { goalsApi } from '../../api/goals.api';
import { accountsApi } from '../../api/accounts.api';
import useApi from '../../hooks/useApi';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';

import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/feedback/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import GoalFormModal from './GoalFormModal';
import './GoalsPage.css';

export default function GoalsPage() {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const listApi = useApi(goalsApi.getAll);
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await goalsApi.delete(id);
      showToast('Goal deleted successfully', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete goal', 'error');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingItem) {
        await goalsApi.update(editingItem._id, formData);
        showToast('Goal updated successfully', 'success');
      } else {
        await goalsApi.create(formData);
        showToast('Goal created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save goal', 'error');
    }
  };

  const formatCurrency = (val) => `${user?.currency || '₹'} ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Savings Goals</h1>
          <p className="page-subtitle">Track and achieve your financial milestones</p>
        </div>
        <div className="goals-header-actions">
          <Button variant="primary" onClick={handleOpenNew}>
            + New Goal
          </Button>
        </div>
      </div>

      {listApi.isLoading ? (
        <div className="goals-grid">
          {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height="240px" />)}
        </div>
      ) : listApi.error ? (
        <EmptyState title="Failed to load data" description="Please try again later." icon="⚠️" />
      ) : listApi.data?.data?.length > 0 ? (
        <div className="goals-grid">
          {listApi.data.data.map(goal => {
            const isCompleted = goal.status === 'completed';
            const isCancelled = goal.status === 'cancelled';
            const deadlineDate = new Date(goal.deadline);
            const overdue = isPast(deadlineDate) && !isToday(deadlineDate) && !isCompleted && !isCancelled;
            
            return (
              <Card 
                key={goal._id} 
                padding="lg" 
                className={`goal-card ${isCompleted ? 'is-completed' : ''} ${isCancelled ? 'is-cancelled' : ''}`}
              >
                <div className="goal-header">
                  <h3 className="goal-title">
                    {isCompleted ? '🏆' : '🎯'} {goal.title}
                  </h3>
                  <div className="goal-badges">
                    {goal.priority === 'high' && <Badge variant="danger">High Priority</Badge>}
                    {isCompleted && <Badge variant="success">Completed</Badge>}
                    {isCancelled && <Badge variant="neutral">Cancelled</Badge>}
                  </div>
                </div>

                <div className="goal-progress-section">
                  <div className="goal-amounts">
                    <span className="goal-current">{formatCurrency(goal.currentAmount)}</span>
                    <span className="goal-target">of {formatCurrency(goal.targetAmount)}</span>
                  </div>
                  
                  <div className="progress-track">
                    <div 
                      className={`progress-fill ${isCompleted ? 'completed' : overdue ? 'danger' : 'active'}`}
                      style={{ width: `${goal.completionPercentage}%` }}
                    />
                  </div>
                  <div className="goal-percentage">
                    {goal.completionPercentage}%
                  </div>
                </div>

                <div className="goal-meta">
                  <div className={`goal-deadline ${overdue ? 'overdue' : ''}`}>
                    ⏳ {format(deadlineDate, 'MMM dd, yyyy')} {overdue && '(Overdue)'}
                  </div>
                  {!isCompleted && !isCancelled && (
                    <div className="goal-remaining">
                      {formatCurrency(goal.remainingAmount)} left
                    </div>
                  )}
                </div>

                <div className="goal-footer">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(goal)}>
                    {isCompleted ? 'View / Edit' : 'Update Progress'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(goal._id)} 
                    style={{ color: 'var(--color-danger)' }}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState 
          title="No Savings Goals" 
          description="Set a target and start tracking your progress today." 
          icon="🏦"
          action={<Button variant="primary" onClick={handleOpenNew}>Create Goal</Button>}
        />
      )}

      {isModalOpen && (
        <GoalFormModal 
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

import { useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Skeleton from '../feedback/Skeleton';
import EmptyState from '../feedback/EmptyState';
import { goalsApi } from '../../api/goals.api';
import useApi from '../../hooks/useApi';
import { AuthContext } from '../../context/AuthContext';
import './SavingsGoalsWidget.css';

export default function SavingsGoalsWidget() {
  const { user } = useContext(AuthContext);
  const listApi = useApi(goalsApi.getAll);

  useEffect(() => {
    listApi.execute();
  }, []);

  const formatCurrency = (val) => `${user?.currency || '₹'}${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`;

  return (
    <Card padding="lg" className="goals-widget-card">
      <div className="goals-widget-header">
        <h3 className="goals-widget-title">
          <span className="goals-widget-icon">🎯</span> Savings Goals
        </h3>
        <Link to="/goals" className="goals-widget-link">View All</Link>
      </div>

      {listApi.isLoading ? (
        <div className="goals-widget-list">
          <Skeleton variant="rectangular" height="48px" />
          <Skeleton variant="rectangular" height="48px" />
        </div>
      ) : listApi.data?.data?.length > 0 ? (
        <div className="goals-widget-list">
          {listApi.data.data.slice(0, 3).map(goal => (
            <div key={goal._id} className="goals-widget-item">
              <div className="goals-widget-item-info">
                <span className="goals-widget-item-title">{goal.title}</span>
                <span className="goals-widget-item-amounts">
                  {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                </span>
              </div>
              <div className="progress-track widget-track">
                <div 
                  className={`progress-fill widget-fill ${goal.status === 'completed' ? 'completed' : 'active'}`}
                  style={{ width: `${goal.completionPercentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No active goals" icon="🏦" />
      )}
    </Card>
  );
}

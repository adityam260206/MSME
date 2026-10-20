import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Card from '../ui/Card';
import './BudgetPredictorWidget.css';

export default function BudgetPredictorWidget({ prediction, isLoading }) {
  const { user } = useContext(AuthContext);
  
  const formatCurrency = (val) => `${user?.currency || '₹'} ${val?.toFixed(2) || '0.00'}`;

  if (isLoading) {
    return (
      <Card padding="lg" className="predictor-card">
        <h3 className="predictor-title">🔮 Spend Predictor</h3>
        <div className="predictor-loading">Analyzing your past spending habits...</div>
      </Card>
    );
  }

  if (!prediction) return null;

  const { predictedTotal, currentMonthSpend, breakdown } = prediction;
  const difference = predictedTotal - currentMonthSpend;
  const isHigher = difference > 0;
  
  return (
    <Card padding="lg" className="predictor-card">
      <div className="predictor-header">
        <h3 className="predictor-title">
          <span className="predictor-icon">🔮</span>
          Spend Predictor
        </h3>
        <span className="predictor-badge">Next Month</span>
      </div>
      
      <div className="predictor-content">
        <div className="predictor-main">
          <p className="predictor-label">Forecasted Spend</p>
          <p className="predictor-total">{formatCurrency(predictedTotal)}</p>
          <p className={`predictor-diff ${isHigher ? 'diff-higher' : 'diff-lower'}`}>
            {isHigher ? '↗ ' : '↘ '}
            {formatCurrency(Math.abs(difference))} {isHigher ? 'more' : 'less'} than this month so far
          </p>
        </div>

        {breakdown && breakdown.length > 0 && (
          <div className="predictor-breakdown">
            <p className="predictor-breakdown-title">Top Predicted Categories</p>
            <div className="predictor-categories">
              {breakdown.slice(0, 3).map(item => (
                <div key={item.categoryId} className="predictor-category">
                  <div className="predictor-category-info">
                    <span className="predictor-category-icon" style={{ backgroundColor: item.color + '20' }}>
                      {item.icon}
                    </span>
                    <span className="predictor-category-name">{item.name}</span>
                  </div>
                  <span className="predictor-category-amount">{formatCurrency(item.predictedAmount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

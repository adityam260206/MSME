import Card from '../ui/Card';
import './StatCard.css';

/**
 * Metric display card (e.g. for Total Income, Balance).
 */
export default function StatCard({ title, value, icon, trend, type = 'neutral' }) {
  return (
    <Card padding="md" className="stat-card animate-slide-up">
      <div className="stat-header">
        <h3 className="stat-title">{title}</h3>
        {icon && <div className={`stat-icon stat-icon-${type}`}>{icon}</div>}
      </div>
      
      <div className="stat-value">{value}</div>
      
      {trend && (
        <div className={`stat-trend ${trend.isPositive ? 'trend-up' : 'trend-down'}`}>
          {trend.isPositive ? '↑' : '↓'} {trend.value}
          <span className="trend-label"> {trend.label}</span>
        </div>
      )}
    </Card>
  );
}

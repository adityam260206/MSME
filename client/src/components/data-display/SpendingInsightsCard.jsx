import Card from '../ui/Card';
import './SpendingInsightsCard.css';

/**
 * Displays a list of auto-generated spending insights.
 *
 * Props:
 *   insights — Array of { type: 'positive'|'info'|'warning', icon: string, text: string }
 *   compact  — Boolean (true = dashboard widget showing max 3, false = full list)
 */
export default function SpendingInsightsCard({ insights = [], compact = false }) {
  const displayInsights = compact ? insights.slice(0, 3) : insights;

  if (displayInsights.length === 0) return null;

  return (
    <Card padding="lg" className="insights-card">
      <h3 className="insights-title">
        <span className="insights-title-icon">💡</span>
        Spending Insights
      </h3>

      <div className="insights-list">
        {displayInsights.map((insight, i) => (
          <div
            key={i}
            className={`insight-item insight-${insight.type}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="insight-icon">{insight.icon}</span>
            <p className="insight-text">{insight.text}</p>
          </div>
        ))}
      </div>

      {compact && insights.length > 3 && (
        <p className="insights-more">
          +{insights.length - 3} more insight{insights.length - 3 > 1 ? 's' : ''} in Analytics
        </p>
      )}
    </Card>
  );
}

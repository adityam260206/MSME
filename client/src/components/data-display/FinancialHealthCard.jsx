import Card from '../ui/Card';
import './FinancialHealthCard.css';

/**
 * Circular progress ring + status badge + explanatory factors.
 *
 * Props:
 *   score   — Number 0-100
 *   status  — 'Excellent' | 'Good' | 'Average' | 'Needs Improvement'
 *   factors — Array of { type: 'positive'|'neutral'|'negative', text: string }
 *   compact — Boolean  (true = dashboard widget, false = full analytics view)
 */
export default function FinancialHealthCard({ score = 0, status = '', factors = [], compact = false }) {
  // SVG ring math
  const radius = compact ? 52 : 64;
  const stroke = compact ? 8 : 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const statusColor = getStatusColor(status);

  return (
    <Card padding="lg" className={`health-card ${compact ? 'health-card-compact' : ''}`}>
      {/* Ring + Score */}
      <div className="health-ring-section">
        <svg className="health-ring" width={radius * 2} height={radius * 2}>
          {/* Background track */}
          <circle
            stroke="var(--border-subtle)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Score arc */}
          <circle
            className="health-ring-progress"
            stroke={statusColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        <div className="health-ring-label">
          <span className="health-score">{score}</span>
          <span className="health-score-max">/100</span>
        </div>
      </div>

      {/* Status badge */}
      <div className="health-meta">
        <h3 className="health-title">Financial Health</h3>
        <span className="health-status-badge" style={{ backgroundColor: statusColor + '20', color: statusColor }}>
          {status}
        </span>
      </div>

      {/* Factors — shown in full mode only */}
      {!compact && factors.length > 0 && (
        <ul className="health-factors">
          {factors.map((factor, i) => (
            <li key={i} className={`health-factor health-factor-${factor.type}`}>
              <span className="health-factor-icon">
                {factor.type === 'positive' ? '✅' : factor.type === 'negative' ? '⚠️' : 'ℹ️'}
              </span>
              <span className="health-factor-text">{factor.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'Excellent': return 'var(--color-success)';
    case 'Good': return 'var(--color-brand)';
    case 'Average': return 'var(--color-warning)';
    case 'Needs Improvement': return 'var(--color-danger)';
    default: return 'var(--text-secondary)';
  }
}

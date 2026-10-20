import './EmptyState.css';

/**
 * EmptyState component for lists or pages with no data.
 */
export default function EmptyState({ 
  icon = '📂', 
  title = 'No data found', 
  description, 
  action 
}) {
  return (
    <div className="empty-state animate-fade-in">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

import './Card.css';

export default function Card({ children, className = '', padding = 'md', interactive = false, onClick }) {
  const classes = [
    'card',
    `card-p-${padding}`,
    interactive ? 'card-interactive' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} role={interactive ? 'button' : undefined} tabIndex={interactive ? 0 : undefined}>
      {children}
    </div>
  );
}

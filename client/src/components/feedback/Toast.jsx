import './Toast.css';

/**
 * Toast presentation component.
 * State management will be handled by ToastContext in Step 17.
 */
export default function Toast({ id, message, type = 'info', onClose }) {
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };

  return (
    <div className={`toast toast-${type} animate-slide-up`}>
      <span className="toast-icon">{icons[type]}</span>
      <p className="toast-message">{message}</p>
      <button className="toast-close" onClick={() => onClose(id)} aria-label="Close toast">
        &times;
      </button>
    </div>
  );
}

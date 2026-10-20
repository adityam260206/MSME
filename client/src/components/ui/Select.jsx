import { forwardRef } from 'react';
import './Input.css'; // Shares input styles

/**
 * Reusable Select component.
 * Mirrors the API and styling of the Input component.
 */
const Select = forwardRef(function Select(
  { label, error, helperText, fullWidth = true, className = '', children, id, ...props },
  ref
) {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`input-group ${fullWidth ? 'input-full' : ''} ${className}`}>
      {label && (
        <label htmlFor={selectId} className="input-label">
          {label}
        </label>
      )}
      
      <div className="select-wrapper">
        <select
          ref={ref}
          id={selectId}
          className={`input-field ${error ? 'input-error' : ''}`}
          {...props}
        >
          {children}
        </select>
        {/* Custom dropdown arrow */}
        <div className="select-arrow">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      {(error || helperText) && (
        <span className={`input-helper ${error ? 'text-error' : 'text-muted'}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
});

export default Select;

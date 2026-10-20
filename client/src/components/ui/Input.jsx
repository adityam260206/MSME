import { forwardRef } from 'react';
import './Input.css';

/**
 * Reusable Input component.
 * Supports labels, error messages, and seamless React Hook Form integration via forwardRef.
 */
const Input = forwardRef(function Input(
  { label, error, helperText, fullWidth = true, className = '', id, ...props },
  ref
) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`input-group ${fullWidth ? 'input-full' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      
      <input
        ref={ref}
        id={inputId}
        className={`input-field ${error ? 'input-error' : ''}`}
        {...props}
      />
      
      {(error || helperText) && (
        <span className={`input-helper ${error ? 'text-error' : 'text-muted'}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
});

export default Input;

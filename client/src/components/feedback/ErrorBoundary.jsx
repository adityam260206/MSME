import { Component } from 'react';
import Button from '../ui/Button';

/**
 * Global Error Boundary.
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing
 * the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In a real production app, send this to Sentry or Datadog
    console.error('[ErrorBoundary] caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={fallbackStyle}>
          <h2>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            The application encountered an unexpected error.
          </p>
          <Button onClick={() => window.location.reload()}>
            Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const fallbackStyle = {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: 'var(--space-6)',
  backgroundColor: 'var(--bg-root)'
};

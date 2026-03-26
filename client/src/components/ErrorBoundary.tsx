import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log silently — never show error UI to users
    console.error('[CV] Error caught:', error.message);
    fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        componentStack: (errorInfo?.componentStack || '').substring(0, 2000),
        url: window.location.href
      })
    }).catch(() => {});
    // Silently redirect to dashboard after a brief delay
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 100);
  }

  render() {
    if (this.state.hasError) {
      // Blank screen while redirect happens — no error UI ever shown
      return null;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

import React, { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false,
  error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Opcional: enviar error a un servicio de monitoreo (por ejemplo, LogRocket, Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Algo salió mal</h2>
          <p>Comunícate con el soporte.</p>
          {process.env.NODE_ENV === 'production' && (
            <details style={{ whiteSpace: 'pre-wrap' }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

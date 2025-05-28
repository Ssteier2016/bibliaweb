import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Algo salió mal.</h1>
          <p>Por favor, recarga la página o contacta al soporte.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

import React from 'react';

// Red de seguridad general: si cualquier componente falla al renderizar por
// una condición específica de un dispositivo/navegador, React desmonta todo
// el árbol y deja una pantalla en blanco sin ningún aviso. Esto captura ese
// error y muestra una salida con la que el usuario puede recuperarse.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Error no capturado en la aplicación:', error, info);
  }

  handleReload = () => {
    try {
      // Por si el estado guardado en localStorage está corrupto y es la causa del error.
      localStorage.removeItem('bible_translation');
    } catch {}
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '32px 24px', gap: 16, background: '#faf8f5', color: '#1c1917',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ fontSize: 40 }}>📖</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Algo salió mal</div>
        <div style={{ fontSize: 14, color: '#78716c', maxWidth: 320 }}>
          Bibl.ia encontró un problema al cargar. Probá recargar la aplicación.
        </div>
        <button
          onClick={this.handleReload}
          style={{
            marginTop: 8, padding: '10px 20px', borderRadius: 10, border: 'none',
            background: '#92400e', color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Recargar
        </button>
      </div>
    );
  }
}

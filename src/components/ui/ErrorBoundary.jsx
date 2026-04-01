import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Erro capturado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 20 }}>
          <div style={{ maxWidth: 500, textAlign: "center" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>Erro na Renderização</h1>
            <p style={{ fontSize: 14, color: "var(--text-sec)", marginBottom: 16, lineHeight: 1.6 }}>
              Ocorreu um erro ao carregar a aplicação. Por favor, recarregue a página.
            </p>
            <details style={{ marginTop: 16, padding: 12, background: "var(--bg-hover)", borderRadius: 8, textAlign: "left", fontSize: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 8 }}>Detalhes do Erro</summary>
              <pre style={{ overflow: "auto", padding: 8, background: "var(--bg-card)", borderRadius: 4, fontSize: 11 }}>{this.state.error?.toString()}</pre>
            </details>
            <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "10px 20px", background: "var(--grad)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

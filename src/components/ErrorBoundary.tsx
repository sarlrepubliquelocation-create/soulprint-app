// ═══ Kaironaute — Error Boundary Global ═══
// Capture les crashes React et affiche un fallback élégant.
// Log les erreurs pour diagnostic (console + optionnel external).

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { P } from './ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log pour diagnostic
    console.error('[Kaironaute ErrorBoundary]', error, errorInfo);

    // Future : envoyer à un service externe (Sentry, LogRocket, etc.)
    // if (window.__KAIRONAUTE_ERROR_REPORTER) {
    //   window.__KAIRONAUTE_ERROR_REPORTER(error, errorInfo);
    // }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: P.bg,
          color: P.text,
          fontFamily: "'Cormorant Garamond', serif",
          padding: 32,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: P.gold }}>
            Perturbation temporelle
          </h2>
          <p style={{ color: P.textDim, maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
            Une erreur inattendue s'est produite.
            Vos données sont intactes — essayez de recharger.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '10px 24px',
                background: P.gold,
                color: P.bg,
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                background: 'transparent',
                color: P.textDim,
                border: `1px solid ${P.card}`,
                borderRadius: 8,
                fontSize: 15,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Recharger
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details style={{
              marginTop: 32,
              textAlign: 'left',
              maxWidth: 600,
              width: '100%',
              color: P.textDim,
              fontSize: 12,
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Détails (dev)</summary>
              <pre style={{
                background: P.card,
                padding: 12,
                borderRadius: 8,
                overflow: 'auto',
                maxHeight: 200,
                whiteSpace: 'pre-wrap',
              }}>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

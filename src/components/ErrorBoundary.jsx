import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: '#f6f7fb', fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{
          maxWidth: 440, width: '100%', background: '#fff', border: '1px solid #e6e8ef',
          borderRadius: 16, padding: '36px 32px', textAlign: 'center',
          boxShadow: '0 12px 40px -16px rgba(15,23,42,0.18)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#fee2e2', color: '#dc2626', fontSize: 28,
          }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', color: '#0f172a' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
            An unexpected error stopped this page from loading. Refreshing usually fixes it.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', border: 'none',
                padding: '11px 22px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              Refresh page
            </button>
            <a
              href="mailto:henryengrakpan@gmail.com?subject=BizlyAI%20error"
              style={{
                display: 'inline-flex', alignItems: 'center', padding: '11px 22px', borderRadius: 10,
                fontWeight: 700, fontSize: 14, color: '#475569', textDecoration: 'none',
                border: '1px solid #e6e8ef', background: '#fff',
              }}
            >
              Contact support
            </a>
          </div>
        </div>
      </div>
    );
  }
}

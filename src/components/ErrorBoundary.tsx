import React from 'react';

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null, info: React.ErrorInfo | null}> {
  public state = { hasError: false, error: null as Error | null, info: null as React.ErrorInfo | null };

  constructor(props: {children: React.ReactNode}) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fef2f2', color: '#991b1b', borderRadius: 8, margin: 20, fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>{this.state.error?.toString()}</summary>
            <br />
            {this.state.info?.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

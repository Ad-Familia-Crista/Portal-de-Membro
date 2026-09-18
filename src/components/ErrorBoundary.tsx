import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="max-w-xl mx-auto p-6 my-12 bg-white rounded-2xl shadow-lg border border-rose-100 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-primary">Algo não carregou corretamente</h2>
          <p className="text-sm text-muted">
            {this.state.error?.message || 'Ocorreu uma falha inesperada ao exibir esta seção.'}
          </p>
          <Button onClick={this.handleReset} className="mx-auto">
            <RefreshCw className="w-4 h-4 mr-2" /> Recarregar Página
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

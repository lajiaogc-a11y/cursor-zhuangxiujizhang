import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logClientError } from '@/services/admin.service';
import { spaNavigate } from '@/lib/spaNavigate';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Log to database (fire-and-forget)
    this.logError(error, errorInfo);
  }

  private async logError(error: Error, errorInfo: ErrorInfo) {
    try {
      await logClientError({
        error_message: error.message,
        error_stack: error.stack?.slice(0, 4000) || null,
        component_stack: errorInfo.componentStack?.slice(0, 4000) || null,
        url: window.location.href,
        user_agent: navigator.userAgent,
      });
    } catch {
      // Silent fail - don't crash the error boundary
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    spaNavigate('/dashboard');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-dvh flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">页面出现错误</h1>
              <p className="text-muted-foreground">
                抱歉，页面遇到了意外错误。我们已自动记录此问题。
              </p>
            </div>
            {this.state.error && (
              <details className="text-left bg-muted rounded-lg p-3">
                <summary className="text-sm font-medium cursor-pointer text-muted-foreground">
                  错误详情
                </summary>
                <pre className="mt-2 text-xs text-destructive overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReload} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新页面
              </Button>
              <Button onClick={this.handleGoHome} variant="outline">
                返回首页
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

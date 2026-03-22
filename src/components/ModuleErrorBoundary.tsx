import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { spaNavigate } from '@/lib/spaNavigate';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Module-level error boundary.
 * Unlike the top-level ErrorBoundary, this renders an inline error card
 * without taking down the entire app (sidebar/layout remain functional).
 */
export class ModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.moduleName ?? 'Module'}] Error:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[50dvh] sm:min-h-[55dvh] p-6 bg-background/80">
          <div className="max-w-sm w-full text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                {this.props.moduleName ?? '模块'}加载出错
              </h2>
              <p className="text-sm text-muted-foreground">
                该模块遇到错误，其余功能不受影响。
              </p>
            </div>
            {this.state.error && (
              <details className="text-left bg-muted rounded-lg p-2">
                <summary className="text-xs font-medium cursor-pointer text-muted-foreground">详情</summary>
                <pre className="mt-1 text-xs text-destructive overflow-auto max-h-24">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={this.handleRetry}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                重试
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  spaNavigate('/');
                }}
              >
                <Home className="w-3.5 h-3.5 mr-1.5" />
                首页
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

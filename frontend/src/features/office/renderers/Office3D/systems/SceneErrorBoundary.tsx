import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  onFallbackTo2D: () => void
  onFallbackToList: () => void
}

interface State {
  hasError: boolean
  errorMessage: string
}

export class Office3DErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    errorMessage: '',
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || '3D WebGL context or rendering pipeline error',
    }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Office3DErrorBoundary] Caught 3D renderer error:', error, errorInfo)
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' })
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-full h-160 flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="max-w-md space-y-1.5">
            <h3 className="text-base font-semibold text-text-primary font-mono-tech">
              3D renderer encountered a problem.
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              The 3D WebGL scene failed to initialize or lost context. You can retry the 3D scene or immediately switch to the high-performance 2.5D or accessible List view.
            </p>
            {this.state.errorMessage && (
              <div className="mt-2 p-2 rounded bg-surface-subtle border border-border-subtle text-[11px] font-mono-tech text-text-muted truncate max-w-sm mx-auto">
                {this.state.errorMessage}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              className="h-8 text-xs gap-1.5 border-border bg-surface hover:bg-surface-hover"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry 3D</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={this.props.onFallbackTo2D}
              className="h-8 text-xs gap-1.5 bg-interactive text-white hover:bg-interactive-hover"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Switch to 2.5D</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={this.props.onFallbackToList}
              className="h-8 text-xs gap-1.5 border-border bg-surface hover:bg-surface-hover"
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

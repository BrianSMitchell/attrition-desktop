import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  info?: React.ErrorInfo
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_error: Error) {
    // We don't need the error here; react will re-render with hasError=true
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log full error details for diagnostics
    console.error('[UI ErrorBoundary] Caught error:', error)
    console.error('[UI ErrorBoundary] Component stack:', info?.componentStack)
    this.setState({ error, info })
  }

  private decodeReactMinifiedError(msg?: string): string | null {
    if (!msg) return null
    // Try to extract the invariant code, e.g. "Minified React error #300"
    const m = msg.match(/Minified React error\s+#(\d+)/i)
    const code = m?.[1]
    if (!code) return null

    const hints: Record<string, string> = {
      // 300: commonly seen when a component type is invalid (undefined),
      // due to an import/export mismatch (default vs named), or mixed renderers.
      '300': [
        'Likely causes:',
        '- Invalid element type (rendering undefined or non-component).',
        '- Import/export mismatch (default vs named import).',
        '- Multiple versions of React or mixed dev/prod bundles.',
        'Actions:',
        '- Check component imports in stack above.',
        '- Ensure only one copy of react and react-dom is installed.',
        '- In dev, avoid minified builds; rebuild client to ensure dev mode.',
      ].join('\n')
    }

    const common = hints[code]
    const url = 'https://reactjs.org/docs/error-decoder.html?invariant=' + code
    return `React error #${code}.\n${common ? common + '\n' : ''}More info: ${url}`
  }

  render() {
    if (this.state.hasError) {
      const friendly = this.decodeReactMinifiedError(this.state.error?.message)
      return (
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-2">Something went wrong.</h2>
          {import.meta.env.DEV && (
            <>
              <pre className="whitespace-pre-wrap bg-gray-100 p-3 rounded mb-3">
                {friendly || this.state.error?.message}
              </pre>
              <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded">
                {this.state.info?.componentStack}
              </pre>
            </>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

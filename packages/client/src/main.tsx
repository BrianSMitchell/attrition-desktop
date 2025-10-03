import ReactDOM from 'react-dom/client'
// Enable PIXI dev eval shim only in development to avoid unsafe-eval in production builds
if (import.meta.env.DEV) {
  // Load asynchronously; no need to block render
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  import('@pixi/unsafe-eval');
}
import ServiceApp from './ServiceApp.tsx'
import './index.css'
import { schedulePrefetch } from './prefetch'
import ErrorBoundary from './components/ui/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ServiceApp />
  </ErrorBoundary>,
)

// Schedule small, non-Pixi prefetches after first paint
try {
  schedulePrefetch()
} catch {}

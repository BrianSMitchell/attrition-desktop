import * as React from 'react'
import type { UniverseMapRef, UniverseMapProps } from './UniverseMap'

// Runtime loader to defer importing the Pixi-heavy UniverseMap until mount.
// Uses a dynamic path that Vite cannot statically analyze, preventing modulepreload.
const UniverseMapLoader = React.forwardRef<UniverseMapRef, UniverseMapProps>((props, ref) => {
  const [Inner, setInner] = React.useState<any>(null)

  React.useEffect(() => {
    // Use a static import path so Vite can include and hash the chunk correctly
    let cancelled = false
    ;(async () => {
      try {
        const mod = await import('./UniverseMap')
        if (!cancelled) {
          setInner(() => mod.default)
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[UniverseMapLoader] Failed to load UniverseMap', e)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (!Inner) {
    return <div className="p-4 text-center">Loading map…</div>
  }

  return <Inner ref={ref} {...props} />
})

UniverseMapLoader.displayName = 'UniverseMapLoader'

export default UniverseMapLoader
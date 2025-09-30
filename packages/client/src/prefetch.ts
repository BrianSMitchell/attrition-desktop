// KISS prefetch: selectively warm up small, non-Pixi vendors at idle/hover.
// Never import any Pixi or map modules here.

export function schedulePrefetch() {
  if (typeof window === 'undefined') return

  // Respect data saver / poor connections
  const nav: any = navigator as any
  const conn = nav?.connection
  const saveData = !!conn?.saveData
  const eff = String(conn?.effectiveType || '')
  const slow = eff.includes('2g') || eff.includes('slow-2g')
  if (saveData || slow) return

  const idle = (cb: () => void) => {
    const ric = (window as any).requestIdleCallback as ((fn: () => void, opts?: any) => void) | undefined
    if (typeof ric === 'function') {
      ric(cb, { timeout: 1500 })
    } else {
      setTimeout(cb, 800)
    }
  }

  idle(() => {
    // Intentionally small & common deps; do NOT add any Pixi/module-next imports here.
    const ax = 'ax' + 'ios'
    const zd = 'zo' + 'd'
    const rrd = 'react-router' + '-dom'
    const tasks: Promise<unknown>[] = [
      import(/* @vite-ignore */ ax as any).catch(() => {}),
      import(/* @vite-ignore */ zd as any).catch(() => {}),
      import(/* @vite-ignore */ rrd as any).catch(() => {}),
    ]
    void Promise.allSettled(tasks)
  })
}

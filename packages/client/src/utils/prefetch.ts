// Lightweight prefetch utilities to improve navigation responsiveness
// - Schedules small vendor chunk prefetching after first paint/idle
// - Prefetches route chunks on hover to accelerate navigation

// requestIdleCallback polyfill
function scheduleIdle(fn: () => void, timeout = 1500) {
  const win = typeof window !== 'undefined' ? (window as any) : undefined;
  if (win && typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(() => fn(), { timeout });
  } else {
    // Fallback: run shortly after first paint
    setTimeout(fn, timeout);
  }
}

const prefetched = new Set<string>();

export function prefetchVendors() {
  scheduleIdle(() => {
    // Only prefetch once per session
    const key = 'vendors';
    if (prefetched.has(key)) return;
    prefetched.add(key);

    // Intentionally small libs; avoid Pixi-heavy imports here
    // Build dynamic specifier for zod to avoid TS resolver complaints if not listed directly
    const z = 'z' + 'od';
    void Promise.allSettled([
      import('axios'),
      import(/* @vite-ignore */ (z as any)),
      import('react-router-dom'),
    ]);
  }, 1200);
}

export function prefetchRoute(path: string) {
  // Normalize query/hash-less route
  const clean = path.split('#')[0].split('?')[0];
  if (!clean || prefetched.has(clean)) return;

  switch (clean) {
    case '/dashboard':
      prefetched.add(clean);
      void import('../components/game/Dashboard');
      break;
    case '/bases':
      prefetched.add(clean);
      void import('../components/game/BasesPage');
      break;
    case '/universe':
      prefetched.add(clean);
      void import('../components/game/UniversePage');
      break;
    case '/galaxy':
      prefetched.add(clean);
      void import('../components/game/GalaxyPage');
      break;
    case '/help':
      prefetched.add(clean);
      void import('../components/help/HelpPage');
      break;
    case '/messages':
      prefetched.add(clean);
      void import('../components/game/MessagesPage');
      break;
    case '/admin/performance':
      prefetched.add(clean);
      void import('../components/admin/PerformancePage');
      break;
    case '/login':
      prefetched.add(clean);
      void import('../components/auth/Login');
      break;
    case '/register':
      prefetched.add(clean);
      void import('../components/auth/Register');
      break;
    default:
      // For parameterized routes, prefetch likely base pages
      if (clean.startsWith('/planet/')) {
        prefetched.add('/planet');
        void import('../components/game/PlanetPage');
      } else if (clean.startsWith('/base/')) {
        prefetched.add('/base');
        void import('../components/game/BasePage');
      }
      break;
  }
}
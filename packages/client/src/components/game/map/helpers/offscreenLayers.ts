/**
 * Offscreen canvas layer helpers for caching and composition.
 * Keep this browser-only (no import.meta or SSR usage).
 */

export type LayerCache = Map<string, HTMLCanvasElement>;

/**
 * Create an offscreen canvas of the given size.
 */
export function createOffscreenLayer(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Clear and draw into a layer using the provided draw function.
 */
export function drawToLayer(
  layer: HTMLCanvasElement,
  draw: (ctx: CanvasRenderingContext2D) => void
): void {
  const ctx = layer.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, layer.width, layer.height);
  draw(ctx);
}

/**
 * Compose multiple layers onto a target 2D context.
 * Layers are drawn in order.
 */
export function composeLayers(
  targetCtx: CanvasRenderingContext2D,
  layers: HTMLCanvasElement[]
): void {
  for (const layer of layers) {
    targetCtx.drawImage(layer, 0, 0);
  }
}

/**
 * Minimal stable serialization for dependency fingerprints.
 * The caller should pass a minimized deps object (ids/flags/hashes only).
 */
export function getCacheKeyFromDeps(deps: Record<string, unknown>): string {
  // Stable stringify with sorted keys and circular guard
  const seen = new WeakSet<object>();

  const stable = (value: any): string => {
    const t = typeof value;
    if (value === null || t === "number" || t === "boolean") return JSON.stringify(value);
    if (t === "string") return JSON.stringify(value);
    if (t === "undefined") return '"__undef__"';
    if (t === "function" || t === "symbol") return `"__${t}__"`;

    if (Array.isArray(value)) {
      return `[${value.map((v) => stable(v)).join(",")}]`;
    }

    if (t === "object") {
      if (seen.has(value)) return '"__circular__"';
      seen.add(value);
      const keys = Object.keys(value).sort();
      const entries = keys.map((k) => `${JSON.stringify(k)}:${stable((value as any)[k])}`);
      return `{${entries.join(",")}}`;
    }

    // Fallback
    try {
      return JSON.stringify(value);
    } catch {
      return `"${String(value)}"`;
    }
  };

  try {
    return stable(deps);
  } catch {
    // Final fallback: deterministic key=value join
    return Object.keys(deps)
      .sort()
      .map((k) => `${k}=${String((deps as any)[k])}`)
      .join("&");
  }
}

/**
 * Build or reuse a cached offscreen layer based on a key prefix and dependency fingerprint.
 * The builder should create the layer and fully render its content.
 */
export function buildCachedLayer(
  keyPrefix: string,
  deps: Record<string, unknown>,
  cache: LayerCache,
  builder: () => HTMLCanvasElement
): HTMLCanvasElement {
  const key = `${keyPrefix}:${getCacheKeyFromDeps(deps)}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const layer = builder();
  cache.set(key, layer);
  return layer;
}

/**
 * Optionally clear cached layers by predicate. If no predicate is supplied, clears all.
 */
export function clearLayerCache(
  cache: LayerCache,
  predicate?: (key: string) => boolean
): void {
  for (const key of cache.keys()) {
    if (!predicate || predicate(key)) {
      cache.delete(key);
    }
  }
}

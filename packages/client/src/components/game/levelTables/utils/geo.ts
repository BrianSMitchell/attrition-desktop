/**
 * Geometric growth helper for generating credits sequences.
 * Start value is included as the first element. Values are Math.round()'d each step.
 *
 * Example:
 *   geoSeries({ start: 256, ratio: 1.5, levels: 10 })
 */
export function geoSeries(params: { start: number; ratio: number; levels: number }): number[] {
  const { start, ratio, levels } = params;
  const out: number[] = [];
  let cur = start;
  for (let i = 0; i < levels; i++) {
    out.push(Math.round(cur));
    cur *= ratio;
  }
  return out;
}

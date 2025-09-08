import { GALAXY_LAYOUT, calculateFittedGridLayout, getClickedIndex } from './mapConstants';

/**
 * Pure click-mapping helper for GalaxyView.
 * Decoupled from React and any universe services so it can be tested under Jest without Vite/import.meta.
 */
export const handleGalaxyViewClick = (
  clickX: number,
  clickY: number,
  canvasWidth: number,
  canvasHeight: number
): number | null => {
  const { regionSize, padding, cols, rows } = GALAXY_LAYOUT;
  const fitted = calculateFittedGridLayout(canvasWidth, canvasHeight, regionSize, padding, cols, rows);

  return getClickedIndex(
    clickX,
    clickY,
    fitted.startX,
    fitted.startY,
    fitted.itemSize,
    fitted.padding,
    cols,
    rows,
    fitted.totalWidth,
    fitted.totalHeight
  );
};

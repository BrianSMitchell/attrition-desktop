// Shared constants for consistent layout across all map components

export const UNIVERSE_LAYOUT = {
  galaxySize: 80,
  padding: 20,
  cols: 8,
  rows: 5,
  totalGalaxies: 40
} as const;

export const GALAXY_LAYOUT = {
  regionSize: 60,
  padding: 10,
  cols: 10,
  rows: 10,
  totalRegions: 100
} as const;

export const REGION_LAYOUT = {
  systemSize: 40,
  padding: 15,
  cols: 10,
  rows: 10,
  maxSystems: 100
} as const;

export const SYSTEM_LAYOUT = {
  bodySize: 30,
  padding: 12,
  cols: 8,
  rows: 6,
  maxBodies: 48
} as const;

export const STANDARD_ORBITS = [60, 90, 120, 150, 180, 210, 240, 270] as const;

// Helper functions for coordinate calculations
export const calculateGridLayout = (
  canvasWidth: number,
  canvasHeight: number,
  itemSize: number,
  padding: number,
  cols: number,
  rows: number
) => {
  const totalWidth = cols * itemSize + (cols - 1) * padding;
  const totalHeight = rows * itemSize + (rows - 1) * padding;
  
  const startX = (canvasWidth - totalWidth) / 2;
  const startY = (canvasHeight - totalHeight) / 2;
  
  return {
    totalWidth,
    totalHeight,
    startX,
    startY
  };
};

/**
 * Calculate a fitted grid layout that uniformly scales itemSize and padding
 * so the entire grid fits within the canvas with a margin. Returns the
 * scaled itemSize/padding and centered startX/startY.
 */
export const calculateFittedGridLayout = (
  canvasWidth: number,
  canvasHeight: number,
  baseItemSize: number,
  basePadding: number,
  cols: number,
  rows: number,
  margin: number = 16
) => {
  // Base (unscaled) total dimensions
  const baseTotalWidth = cols * baseItemSize + (cols - 1) * basePadding;
  const baseTotalHeight = rows * baseItemSize + (rows - 1) * basePadding;

  // Available space after applying margin on all sides
  const availableWidth = Math.max(0, canvasWidth - margin * 2);
  const availableHeight = Math.max(0, canvasHeight - margin * 2);

  // Uniform scale to fit both width and height
  const scale = Math.min(
    availableWidth / baseTotalWidth,
    availableHeight / baseTotalHeight
  );

  // Scaled sizes
  const itemSize = baseItemSize * scale;
  const padding = basePadding * scale;

  // Recompute scaled totals
  const totalWidth = cols * itemSize + (cols - 1) * padding;
  const totalHeight = rows * itemSize + (rows - 1) * padding;

  // Center the grid
  const startX = (canvasWidth - totalWidth) / 2;
  const startY = (canvasHeight - totalHeight) / 2;

  return {
    scale,
    itemSize,
    padding,
    startX,
    startY,
    totalWidth,
    totalHeight,
    margin
  };
};

export const getGridPosition = (
  index: number,
  cols: number,
  itemSize: number,
  padding: number,
  startX: number,
  startY: number
) => {
  const row = Math.floor(index / cols);
  const col = index % cols;
  
  const x = startX + col * (itemSize + padding);
  const y = startY + row * (itemSize + padding);
  
  return { x, y, row, col };
};

export const getClickedIndex = (
  clickX: number,
  clickY: number,
  startX: number,
  startY: number,
  itemSize: number,
  padding: number,
  cols: number,
  rows: number,
  totalWidth: number,
  totalHeight: number
): number | null => {
  // Check if click is within the grid area
  if (clickX < startX || clickX > startX + totalWidth || 
      clickY < startY || clickY > startY + totalHeight) {
    return null;
  }
  
  const relativeX = clickX - startX;
  const relativeY = clickY - startY;
  
  const col = Math.floor(relativeX / (itemSize + padding));
  const row = Math.floor(relativeY / (itemSize + padding));
  
  // Check if click is within an item (not in padding area)
  const itemLocalX = relativeX % (itemSize + padding);
  const itemLocalY = relativeY % (itemSize + padding);
  
  if (itemLocalX < itemSize && itemLocalY < itemSize && 
      col < cols && row < rows) {
    const index = row * cols + col;
    return index;
  }
  
  return null;
};

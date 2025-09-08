/**
 * Coordinate Mapping System for Universe Map
 * 
 * This system ensures that objects maintain consistent spatial relationships
 * across different zoom levels. For example, a star that appears in the top-right
 * of a region should appear in the same relative position when viewing that
 * region from the galaxy level.
 */

import { generateSeedFromCoordinate } from '@game/shared';

export interface SpatialPosition {
  x: number;
  y: number;
}

export interface GridLayout {
  itemSize: number;
  padding: number;
  cols: number;
  rows: number;
  totalWidth: number;
  totalHeight: number;
  startX: number;
  startY: number;
}

/**
 * Calculate grid layout for any zoom level
 */
export const calculateGridLayout = (
  canvasWidth: number,
  canvasHeight: number,
  itemSize: number,
  padding: number,
  cols: number,
  rows: number
): GridLayout => {
  const totalWidth = cols * itemSize + (cols - 1) * padding;
  const totalHeight = rows * itemSize + (rows - 1) * padding;
  
  const startX = (canvasWidth - totalWidth) / 2;
  const startY = (canvasHeight - totalHeight) / 2;

  return {
    itemSize,
    padding,
    cols,
    rows,
    totalWidth,
    totalHeight,
    startX,
    startY
  };
};

/**
 * Get the pixel position of a grid item
 */
export const getGridItemPosition = (
  layout: GridLayout,
  index: number
): SpatialPosition => {
  const row = Math.floor(index / layout.cols);
  const col = index % layout.cols;
  
  return {
    x: layout.startX + col * (layout.itemSize + layout.padding),
    y: layout.startY + row * (layout.itemSize + layout.padding)
  };
};

/**
 * Get the center position of a grid item
 */
export const getGridItemCenter = (
  layout: GridLayout,
  index: number
): SpatialPosition => {
  const position = getGridItemPosition(layout, index);
  return {
    x: position.x + layout.itemSize / 2,
    y: position.y + layout.itemSize / 2
  };
};

/**
 * Seed-based random number generator for consistent positioning
 * This ensures that "random" star positions are the same every time
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

/**
 * Generate consistent star positions within a region/system
 */
export const generateStarPositions = (
  regionId: number,
  galaxyId: number,
  bounds: { width: number; height: number; padding: number },
  starCount: number
): SpatialPosition[] => {
  // Create a unique seed based on galaxy and region
  const seed = galaxyId * 1000 + regionId;
  const rng = new SeededRandom(seed);
  
  const positions: SpatialPosition[] = [];
  const { width, height, padding } = bounds;
  
  for (let i = 0; i < starCount; i++) {
    positions.push({
      x: padding + rng.nextInRange(0, width - 2 * padding),
      y: padding + rng.nextInRange(0, height - 2 * padding)
    });
  }
  
  return positions;
};

/**
 * Generate consistent system positions within a region
 * These positions will be used both in region view and when zooming into systems
 */
export const generateSystemPositions = (
  coordinate: string
): Array<SpatialPosition & { brightness: number }> => {
  // Parse coordinate to get galaxy and region IDs
  const parts = coordinate.split(':');
  const galaxyId = parseInt(parts[0].substring(1), 10);
  const regionId = parseInt(parts[1], 10);
  
  const seed = galaxyId * 10000 + regionId * 100;
  const rng = new SeededRandom(seed);
  
  // Generate 8-23 systems per region
  const systemCount = Math.floor(rng.nextInRange(8, 24));
  const positions: Array<SpatialPosition & { brightness: number }> = [];
  
  for (let i = 0; i < systemCount; i++) {
    // Generate positions in normalized coordinates (0-1)
    // These will be scaled to actual pixel coordinates when rendering
    positions.push({
      x: rng.nextInRange(0.05, 0.95), // Keep away from edges
      y: rng.nextInRange(0.05, 0.95),
      brightness: rng.nextInRange(0.3, 1.0) // Brightness variation for visual interest
    });
  }
  
  return positions;
};

/**
 * Convert normalized coordinates to pixel coordinates
 */
/**
 * Deterministic position from a coordinate string (e.g., "A00:03:19:00")
 * Produces stable normalized positions (0-1) and a brightness value.
 */
export const positionFromCoord = (
  coord: string
): { x: number; y: number; brightness: number } => {
  const seed = generateSeedFromCoordinate(coord);
  const rng = new SeededRandom(seed);
  const x = rng.nextInRange(0.08, 0.92);
  const y = rng.nextInRange(0.12, 0.88);
  const brightness = rng.nextInRange(0.3, 1.0);
  return { x, y, brightness };
};

export const normalizedToPixel = (
  normalized: SpatialPosition,
  bounds: { x: number; y: number; width: number; height: number }
): SpatialPosition => {
  return {
    x: bounds.x + normalized.x * bounds.width,
    y: bounds.y + normalized.y * bounds.height
  };
};

/**
 * Calculate which grid item was clicked
 */
export const getClickedGridIndex = (
  clickX: number,
  clickY: number,
  layout: GridLayout
): number | null => {
  // Check if click is within the grid bounds
  if (
    clickX < layout.startX ||
    clickX > layout.startX + layout.totalWidth ||
    clickY < layout.startY ||
    clickY > layout.startY + layout.totalHeight
  ) {
    return null;
  }

  // Calculate which grid cell was clicked
  const relativeX = clickX - layout.startX;
  const relativeY = clickY - layout.startY;
  
  const col = Math.floor(relativeX / (layout.itemSize + layout.padding));
  const row = Math.floor(relativeY / (layout.itemSize + layout.padding));
  
  // Check if click was within an actual item (not in padding)
  const itemLocalX = relativeX % (layout.itemSize + layout.padding);
  const itemLocalY = relativeY % (layout.itemSize + layout.padding);
  
  if (itemLocalX >= layout.itemSize || itemLocalY >= layout.itemSize) {
    return null; // Clicked in padding area
  }
  
  const index = row * layout.cols + col;
  
  // Validate index bounds
  if (col >= layout.cols || row >= layout.rows || index < 0) {
    return null;
  }
  
  return index;
};

/**
 * Zoom level configurations
 */
export const ZOOM_CONFIGS = {
  universe: {
    itemSize: 80,
    padding: 20,
    cols: 8,
    rows: 5,
    totalItems: 40
  },
  galaxy: {
    // Must match GALAXY_LAYOUT in mapConstants.ts to keep draw and click mapping aligned
    itemSize: 60,
    padding: 10,
    cols: 10,
    rows: 10,
    totalItems: 100
  },
  region: {
    itemSize: 60,
    padding: 12,
    cols: 10,
    rows: 10,
    totalItems: 100
  },
  system: {
    // System view uses a different layout - orbital positions
    orbitCount: 8,
    centerX: 0.5,
    centerY: 0.5,
    maxOrbitRadius: 0.4
  }
} as const;

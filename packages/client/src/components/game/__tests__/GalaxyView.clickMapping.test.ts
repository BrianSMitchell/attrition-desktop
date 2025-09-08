import { handleGalaxyViewClick } from '../map/clickMapping';
import { GALAXY_LAYOUT, calculateFittedGridLayout } from '../map/mapConstants';

describe('GalaxyView click mapping parity', () => {
  const canvasWidth = 1000;
  const canvasHeight = 700;

  test('clicking the center of region (row 0, col 0) returns index 0', () => {
    const { startX, startY, itemSize, padding } = calculateFittedGridLayout(
      canvasWidth,
      canvasHeight,
      GALAXY_LAYOUT.regionSize,
      GALAXY_LAYOUT.padding,
      GALAXY_LAYOUT.cols,
      GALAXY_LAYOUT.rows
    );

    const row = 0;
    const col = 0;
    const clickX = startX + col * (itemSize + padding) + itemSize / 2;
    const clickY = startY + row * (itemSize + padding) + itemSize / 2;

    const index = handleGalaxyViewClick(clickX, clickY, canvasWidth, canvasHeight);
    expect(index).toBe(0);
  });

  test('clicking the center of region (row 5, col 5) returns index 55', () => {
    const { startX, startY, itemSize, padding } = calculateFittedGridLayout(
      canvasWidth,
      canvasHeight,
      GALAXY_LAYOUT.regionSize,
      GALAXY_LAYOUT.padding,
      GALAXY_LAYOUT.cols,
      GALAXY_LAYOUT.rows
    );

    const row = 5;
    const col = 5;
    const expectedIndex = row * GALAXY_LAYOUT.cols + col;

    const clickX = startX + col * (itemSize + padding) + itemSize / 2;
    const clickY = startY + row * (itemSize + padding) + itemSize / 2;

    const index = handleGalaxyViewClick(clickX, clickY, canvasWidth, canvasHeight);
    expect(index).toBe(expectedIndex);
  });

  test('clicking outside the grid returns null', () => {
    // Far outside bounds
    const clickX = canvasWidth + 100;
    const clickY = canvasHeight + 100;

    const index = handleGalaxyViewClick(clickX, clickY, canvasWidth, canvasHeight);
    expect(index).toBeNull();
  });

  test('clicking the center of region (row 9, col 9) returns index 99', () => {
    const { startX, startY, itemSize, padding } = calculateFittedGridLayout(
      canvasWidth,
      canvasHeight,
      GALAXY_LAYOUT.regionSize,
      GALAXY_LAYOUT.padding,
      GALAXY_LAYOUT.cols,
      GALAXY_LAYOUT.rows
    );

    const row = 9;
    const col = 9;
    const expectedIndex = row * GALAXY_LAYOUT.cols + col;

    const clickX = startX + col * (itemSize + padding) + itemSize / 2;
    const clickY = startY + row * (itemSize + padding) + itemSize / 2;

    const index = handleGalaxyViewClick(clickX, clickY, canvasWidth, canvasHeight);
    expect(index).toBe(expectedIndex);
  });

  test('clicking within horizontal padding between col 0 and col 1 returns null', () => {
    const { startX, startY, itemSize, padding } = calculateFittedGridLayout(
      canvasWidth,
      canvasHeight,
      GALAXY_LAYOUT.regionSize,
      GALAXY_LAYOUT.padding,
      GALAXY_LAYOUT.cols,
      GALAXY_LAYOUT.rows
    );

    // Between col 0 and 1 horizontally, vertically centered within row 0 item
    const clickX = startX + itemSize + padding / 2;
    const clickY = startY + itemSize / 2;

    const index = handleGalaxyViewClick(clickX, clickY, canvasWidth, canvasHeight);
    expect(index).toBeNull();
  });

  test('clicking at the right edge outside the grid returns null', () => {
    const { startX, startY, itemSize, totalWidth } = calculateFittedGridLayout(
      canvasWidth,
      canvasHeight,
      GALAXY_LAYOUT.regionSize,
      GALAXY_LAYOUT.padding,
      GALAXY_LAYOUT.cols,
      GALAXY_LAYOUT.rows
    );
    // Just outside the right boundary
    const clickX = startX + totalWidth + 1;
    const clickY = startY + itemSize / 2;

    const index = handleGalaxyViewClick(clickX, clickY, canvasWidth, canvasHeight);
    expect(index).toBeNull();
  });

  test('clicking within vertical padding between row 8 and 9 returns null', () => {
    const { startX, startY, itemSize, padding } = calculateFittedGridLayout(
      canvasWidth,
      canvasHeight,
      GALAXY_LAYOUT.regionSize,
      GALAXY_LAYOUT.padding,
      GALAXY_LAYOUT.cols,
      GALAXY_LAYOUT.rows
    );
    // Choose an interior column and click vertically in padding between row 8 and 9
    const col = 4;
    const clickX = startX + col * (itemSize + padding) + itemSize / 2;
    const clickY = startY + 8 * (itemSize + padding) + itemSize + padding / 2;

    const index = handleGalaxyViewClick(clickX, clickY, canvasWidth, canvasHeight);
    expect(index).toBeNull();
  });

  test('click mapping remains correct for a different canvas size (1280x720)', () => {
    const w = 1280;
    const h = 720;
    const { startX, startY, itemSize, padding } = calculateFittedGridLayout(
      w,
      h,
      GALAXY_LAYOUT.regionSize,
      GALAXY_LAYOUT.padding,
      GALAXY_LAYOUT.cols,
      GALAXY_LAYOUT.rows
    );
    const row = 2;
    const col = 3;
    const expectedIndex = row * GALAXY_LAYOUT.cols + col;

    const clickX = startX + col * (itemSize + padding) + itemSize / 2;
    const clickY = startY + row * (itemSize + padding) + itemSize / 2;

    const index = handleGalaxyViewClick(clickX, clickY, w, h);
    expect(index).toBe(expectedIndex);
  });
});

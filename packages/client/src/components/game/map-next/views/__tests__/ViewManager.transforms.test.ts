import { ViewManager } from '../ViewManager';

// Minimal fake viewport to exercise the fallback transform math paths
// We intentionally do NOT provide toWorld/toScreen so ViewManager uses fallback computation.
describe('ViewManager screen↔world transform (fallback math)', () => {
  function makeViewport() {
    const vp: any = {
      // Viewport position (pan)
      x: 0,
      y: 0,
      // Uniform scale for simplicity
      scale: { x: 1, y: 1 },
      // API stubs used by ViewManager
      clampZoom: (_opts: any) => vp, // chainable
      sortableChildren: false,
      center: { x: 0, y: 0 },
      moveCenter: (x: number, y: number) => {
        vp.center.x = x;
        vp.center.y = y;
      },
      animate: (_opts: any) => vp,
      resize: (_w: number, _h: number) => vp
    };
    return vp;
  }

  test('round-trips screen -> world -> screen under pan+zoom', () => {
    const vp = makeViewport();
    // Configure a pan and zoom
    vp.x = 100;
    vp.y = 50;
    vp.scale = { x: 2, y: 2 };

    const vm = new ViewManager({
      viewport: vp,
      width: 800,
      height: 600
    });

    // Screen point
    const sx = 140;
    const sy = 90;

    // Expected world given (screen - pan) / scale
    // (140 - 100)/2 = 20, (90 - 50)/2 = 20
    const world = vm.screenToWorld(sx, sy);
    expect(world.x).toBeCloseTo(20, 6);
    expect(world.y).toBeCloseTo(20, 6);

    // Back to screen: world*scale + pan => 20*2 + 100 = 140 ; 20*2 + 50 = 90
    const screen = vm.worldToScreen(world.x, world.y);
    expect(screen.x).toBeCloseTo(sx, 6);
    expect(screen.y).toBeCloseTo(sy, 6);
  });

  test('identity transform when no pan and unit scale', () => {
    const vp = makeViewport();
    vp.x = 0;
    vp.y = 0;
    vp.scale = { x: 1, y: 1 };

    const vm = new ViewManager({
      viewport: vp,
      width: 800,
      height: 600
    });

    const sx = 300;
    const sy = 200;

    const world = vm.screenToWorld(sx, sy);
    expect(world.x).toBeCloseTo(300, 6);
    expect(world.y).toBeCloseTo(200, 6);

    const screen = vm.worldToScreen(world.x, world.y);
    expect(screen.x).toBeCloseTo(sx, 6);
    expect(screen.y).toBeCloseTo(sy, 6);
  });
});

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

// Mock the offscreenLayers helper to observe cache hygiene calls
jest.mock('../map/helpers/offscreenLayers', () => {
  const actual = jest.requireActual('../map/helpers/offscreenLayers');
  return {
    ...actual,
    // Wrap clearLayerCache so we can assert it was called when deps change
    clearLayerCache: jest.fn(actual.clearLayerCache),
  };
});

import UniverseOverview from '../map/UniverseOverview';
import { clearLayerCache } from '../map/helpers/offscreenLayers';
import { Empire } from '@game/shared';

describe('UniverseOverview cache hygiene (light test)', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    (clearLayerCache as jest.Mock).mockClear();
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      root.unmount();
      root = null;
    }
    container.remove();
  });

  function renderWithProps(props: {
    canvas: HTMLCanvasElement;
    empire: any;
    showGrid: boolean;
    showTerritories: boolean;
  }) {
    if (!root) {
      root = createRoot(container);
    }
    act(() => {
      root!.render(
        <UniverseOverview
          canvas={props.canvas}
          empire={props.empire}
          showGrid={props.showGrid}
          showTerritories={props.showTerritories}
          // viewport prop exists in interface but is not used by component
          // @ts-expect-error - unused in component
          viewport={undefined}
        />
      );
    });
  }

  it('calls clearLayerCache when dimension or flag deps change', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const empire: Empire = {
      _id: 'emp-test',
      userId: 'user-test',
      name: 'Test Empire',
      homeSystem: 'A00:00:00:00',
      territories: ['A00:00:00:00', 'A00:01:00:00'],
      baseCount: 0,
      hasDeletedBase: false,
      resources: { credits: 0, energy: 0 },
      lastResourceUpdate: new Date(),
      lastCreditPayout: new Date(),
      creditsRemainderMilli: 0,
      techLevels: new Map<string, number>(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Initial render
    renderWithProps({
      canvas,
      empire,
      showGrid: true,
      showTerritories: true,
    });

    const initialCalls = (clearLayerCache as jest.Mock).mock.calls.length;

    // Change a flag that is in the hygiene deps (showGrid)
    renderWithProps({
      canvas,
      empire,
      showGrid: false,
      showTerritories: true,
    });

    // Expect cache hygiene invoked at least once after flag change
    expect((clearLayerCache as jest.Mock).mock.calls.length).toBeGreaterThan(initialCalls);

    // Change dimensions (another hygiene dep)
    canvas.width = 1024;
    renderWithProps({
      canvas,
      empire,
      showGrid: false,
      showTerritories: true,
    });

    // Expect invoked again after dimension change
    expect((clearLayerCache as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);

    // Inspect the predicate behavior on the last call
    const lastCall = (clearLayerCache as jest.Mock).mock.calls[(clearLayerCache as jest.Mock).mock.calls.length - 1];
    const predicate = lastCall?.[1] as (k: string) => boolean;
    expect(typeof predicate).toBe('function');
    // MUST target both universe:background and universe:galaxies prefixes
    expect(predicate('universe:background:whatever')).toBe(true);
    expect(predicate('universe:galaxies:whatever')).toBe(true);
    expect(predicate('system:background')).toBe(false);
  });
});

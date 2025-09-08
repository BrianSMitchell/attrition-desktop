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

import SystemView from '../map/SystemView';
import { clearLayerCache } from '../map/helpers/offscreenLayers';
import type { CoordinateComponents, Empire } from '@game/shared';

describe('SystemView cache hygiene (light test)', () => {
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
    selectedCoordinate: CoordinateComponents;
    empire: Empire;
    showResources: boolean;
    serverBodies?: any[];
  }) {
    if (!root) {
      root = createRoot(container);
    }
    act(() => {
      root!.render(
        <SystemView
          canvas={props.canvas}
          selectedCoordinate={props.selectedCoordinate}
          empire={props.empire}
          showResources={props.showResources}
          serverBodies={props.serverBodies}
        />
      );
    });
  }

  it('calls clearLayerCache when canvas dimensions change (system:background)', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const selectedCoordinate: CoordinateComponents = {
      server: 'A',
      galaxy: 0,
      region: 0,
      system: 0,
      body: 0,
    };

    const empire: Empire = {
      _id: 'emp-test',
      userId: 'user-test',
      name: 'Test Empire',
      homeSystem: 'A00:00:00:00',
      territories: ['A00:00:00:00'],
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
      selectedCoordinate,
      empire,
      showResources: false,
      serverBodies: [],
    });

    const initialCalls = (clearLayerCache as jest.Mock).mock.calls.length;

    // Change dimensions (hygiene deps)
    canvas.width = 1024;
    renderWithProps({
      canvas,
      selectedCoordinate,
      empire,
      showResources: false,
      serverBodies: [],
    });

    // Expect invoked after dimension change
    expect((clearLayerCache as jest.Mock).mock.calls.length).toBeGreaterThan(initialCalls);

    // Inspect the predicate behavior on the last call
    const lastCall = (clearLayerCache as jest.Mock).mock.calls[(clearLayerCache as jest.Mock).mock.calls.length - 1];
    const predicate = lastCall?.[1] as (k: string) => boolean;
    expect(typeof predicate).toBe('function');
    // MUST target only system:background for this view
    expect(predicate('system:background')).toBe(true);
    expect(predicate('universe:background:whatever')).toBe(false);
    expect(predicate('universe:galaxies:whatever')).toBe(false);
  });
});

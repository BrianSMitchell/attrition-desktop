/**
 * @jest-environment jsdom
 */
// @ts-nocheck
import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';

// Control knobs for mocks
let currentSearch = 'view=region';
const mockNavigate = jest.fn();

// Mock react-router-dom: only useSearchParams and useNavigate are overridden
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(currentSearch)],
    useNavigate: () => mockNavigate
  };
});

// Spy helpers to capture NextUniverseMap props across renders
type CapturedProps = any[];
const capturedNextProps: CapturedProps = [];

// Mock NextUniverseMap to (1) capture initialView, (2) trigger onViewChange('galaxy') after mount
jest.mock('../../../packages/client/src/components/game/map-next/UniverseMap', () => {
  // Return a functional component that calls onViewChange in an effect
  return {
    __esModule: true,
    default: (props: any) => {
      // capture props for assertions (e.g., initialView.level)
      capturedNextProps.push(props);

      React.useEffect(() => {
        // Simulate a programmatic view change to 'galaxy'
        props.onViewChange?.('galaxy');
      }, []);

      // Render a simple placeholder
      return React.createElement('div', { 'data-testid': 'next-map' }, 'Mock NextUniverseMap');
    }
  };
});

// Mock the map store used by GalaxyPage
const setZoomLevelMock = jest.fn();
jest.mock('../../../packages/client/src/stores/universeMapStore', () => {
  return {
    __esModule: true,
    default: () => ({
      selectedCoordinate: {
        server: 's1',
        galaxy: 0,
      region: 0,
        system: 0,
        body: 0
      },
      zoomLevel: 'universe',
      viewport: { x: 0, y: 0, zoom: 1 },
      setViewport: jest.fn(),
      setZoomLevel: setZoomLevelMock,
      navigateToUniverse: jest.fn(),
      navigateToGalaxy: jest.fn(),
      navigateToRegion: jest.fn()
    })
  };
});

describe('GalaxyPage: URL/store sync with ?view=…', () => {
  beforeEach(() => {
    // reset mocks and captured props
    currentSearch = 'view=region';
    mockNavigate.mockReset();
    setZoomLevelMock.mockReset();
    capturedNextProps.length = 0;
  });

  test('initializes Next map from ?view=region and updates store+URL on onViewChange', async () => {
    // Import after mocks are set up
    const GalaxyPage = (await import('../../../packages/client/src/components/game/GalaxyPage')).default;

    // Ensure feature flag is enabled for Next map path
    (import.meta as any).env = {
      ...(import.meta as any).env,
      VITE_FEATURE_MAP_NEXT: 'true'
    };

    // Render into jsdom
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(React.createElement(GalaxyPage));
    });

    // Assertion A: initialView.level passed to Next component equals 'region' (from ?view)
    const firstProps = capturedNextProps[0];
    expect(firstProps).toBeDefined();
    expect(firstProps.initialView?.level).toBe('region');

    // The mock Next component's effect triggers onViewChange('galaxy'):
    // Assert store updated with 'galaxy'
    expect(setZoomLevelMock).toHaveBeenCalledWith('galaxy');

    // Assert navigate called with replace:true and ?view=galaxy, preserving other params
    expect(mockNavigate).toHaveBeenCalled();
    const [toArg, opts] = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1];
    expect(opts).toEqual({ replace: true });
    // toArg may be object with search
    expect(typeof toArg).toBe('object');
    expect(toArg.search).toContain('view=galaxy');

    // Cleanup
    await act(async () => {
      root.unmount();
    });
  });

  test('preserves existing params when updating ?view', async () => {
    // Start with another param present
    currentSearch = 'foo=1&view=region&bar=ok';

    const GalaxyPage = (await import('../../../packages/client/src/components/game/GalaxyPage')).default;

    (import.meta as any).env = {
      ...(import.meta as any).env,
      VITE_FEATURE_MAP_NEXT: 'true'
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(React.createElement(GalaxyPage));
    });

    // onViewChange('galaxy') called by mock effect
    expect(setZoomLevelMock).toHaveBeenCalledWith('galaxy');

    const [toArg, opts] = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1];
    expect(opts).toEqual({ replace: true });
    expect(toArg.search).toContain('view=galaxy');
    // Other params remain
    expect(toArg.search).toContain('foo=1');
    expect(toArg.search).toContain('bar=ok');

    await act(async () => {
      root.unmount();
    });
  });
});

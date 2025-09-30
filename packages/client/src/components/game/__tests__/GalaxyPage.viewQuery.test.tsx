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

/**
 * Mock legacy UniverseMap to avoid pulling in import.meta usage during tests.
 * GalaxyPage imports this symbol unconditionally, even though we only render it when the flag is off.
 */
jest.mock('../UniverseMap', () => {
  return { __esModule: true, default: () => React.createElement('div', null) };
});

/**
 * Force Map-Next feature flag ON for this test (so GalaxyPage renders NextUniverseMap).
 * The flags module is evaluated at import time, so mock it explicitly.
 */
jest.mock('../map-next/flags', () => {
  return { __esModule: true, isMapNextEnabled: true };
});

// Mock NextUniverseMap to (1) capture initialView, (2) trigger onViewChange('galaxy') after mount
jest.mock('../map-next/UniverseMap', () => {
  return {
    __esModule: true,
    default: (props: any) => {
      capturedNextProps.push(props);
      React.useEffect(() => {
        props.onViewChange?.('galaxy');
      }, []);
      return React.createElement('div', { 'data-testid': 'next-map' }, 'Mock NextUniverseMap');
    }
  };
});

// Mock the map store used by GalaxyPage
const setZoomLevelMock = jest.fn();
jest.mock('../../../stores/universeMapStore', () => {
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

// Mock auth hook to avoid pulling platform/network code
jest.mock('../../../stores/enhancedAppStore', () => {
  return {
    __esModule: true,
    useAuth: () => ({ empire: {} })
  };
});

// Mock apiConfig to avoid import.meta usage in tests
jest.mock('../../../utils/apiConfig', () => {
  return {
    __esModule: true,
    getCurrentApiConfig: () => ({
      forceDevMode: false,
      apiBase: 'http://localhost',
      wsBase: 'ws://localhost'
    })
  };
});

describe('GalaxyPage: URL/store sync with ?view=…', () => {
  beforeEach(() => {
    currentSearch = 'view=region';
    mockNavigate.mockReset();
    setZoomLevelMock.mockReset();
    capturedNextProps.length = 0;
  });

  test('initializes Next map from ?view=region and updates store+URL on onViewChange', async () => {
    const GalaxyPage = (await import('../GalaxyPage')).default;

    // Ensure feature flag is enabled for Next map path (GalaxyPage falls back to process.env)
    (process as any).env = {
      ...(process as any).env,
      VITE_FEATURE_MAP_NEXT: 'true'
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(React.createElement(GalaxyPage));
    });

    // Assert initialView.level equals 'region'
    const firstProps = capturedNextProps[0];
    expect(firstProps).toBeDefined();
    expect(firstProps.initialView?.level).toBe('region');

    // onViewChange('galaxy') path
    expect(setZoomLevelMock).toHaveBeenCalledWith('galaxy');

    // navigate called with replace:true and ?view=galaxy
    expect(mockNavigate).toHaveBeenCalled();
    const [toArg, opts] = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1];
    expect(opts).toEqual({ replace: true });
    expect(typeof toArg).toBe('object');
    expect(toArg.search).toContain('view=galaxy');

    await act(async () => {
      root.unmount();
    });
  });

  test('preserves existing params when updating ?view', async () => {
    currentSearch = 'foo=1&view=region&bar=ok';

    const GalaxyPage = (await import('../GalaxyPage')).default;

    (process as any).env = {
      ...(process as any).env,
      VITE_FEATURE_MAP_NEXT: 'true'
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(React.createElement(GalaxyPage));
    });

    expect(setZoomLevelMock).toHaveBeenCalledWith('galaxy');

    const [toArg, opts] = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1];
    expect(opts).toEqual({ replace: true });
    expect(toArg.search).toContain('view=galaxy');
    expect(toArg.search).toContain('foo=1');
    expect(toArg.search).toContain('bar=ok');

    await act(async () => {
      root.unmount();
    });
  });
});

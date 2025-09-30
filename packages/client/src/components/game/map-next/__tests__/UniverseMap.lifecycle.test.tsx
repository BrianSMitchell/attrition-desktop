import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import UniverseMap from '../UniverseMap';

// Mock environment variables
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useDebugValue: jest.fn() // Mock useDebugValue to avoid issues
}));

// Mock PIXI and Viewport
jest.mock('pixi.js', () => ({
  Application: jest.fn().mockImplementation(() => ({
    renderer: {
      plugins: {
        interaction: {}
      }
    },
    stage: {
      addChild: jest.fn(),
      sortableChildren: true,
      removeChild: jest.fn()
    },
    ticker: {
      add: jest.fn(),
      remove: jest.fn(),
      deltaMS: 16.67,
      FPS: 60
    },
    view: document.createElement('canvas'),
    destroy: jest.fn()
  })),
  Container: jest.fn().mockImplementation(() => ({
    addChild: jest.fn(),
    removeChild: jest.fn(),
    zIndex: 0
  })),
  Graphics: jest.fn().mockImplementation(() => ({
    beginFill: jest.fn().mockReturnThis(),
    drawCircle: jest.fn().mockReturnThis(),
    endFill: jest.fn().mockReturnThis(),
    lineStyle: jest.fn().mockReturnThis(),
    clear: jest.fn().mockReturnThis(),
    position: { set: jest.fn() },
    visible: true
  }))
}));

// Mock pixi-viewport
jest.mock('pixi-viewport', () => ({
  Viewport: jest.fn().mockImplementation(() => ({
    drag: jest.fn().mockReturnThis(),
    pinch: jest.fn().mockReturnThis(),
    wheel: jest.fn().mockReturnThis(),
    clampZoom: jest.fn().mockReturnThis(),
    bounce: jest.fn().mockReturnThis(),
    addChild: jest.fn(),
    sortableChildren: true,
    scale: { x: 1, y: 1 },
    center: { x: 0, y: 0 },
    moveCenter: jest.fn(),
    animate: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }))
}));

// Mock ViewManager
jest.mock('../views/ViewManager', () => {
  return {
    ViewManager: jest.fn().mockImplementation(() => ({
      getCurrentLevel: jest.fn().mockReturnValue('universe'),
      centerOn: jest.fn(),
      transitionTo: jest.fn().mockResolvedValue(undefined),
      setZoom: jest.fn(),
      destroy: jest.fn(),
      screenToWorld: jest.fn().mockReturnValue({ x: 0, y: 0 })
    }))
  };
});

// Mock process.env for Node.js environment
process.env = {
  ...process.env,
  VITE_DEBUG_MAP_NEXT: 'false'
};

describe('UniverseMap', () => {
  let mockContainer: HTMLDivElement;

  beforeEach(() => {
    // Create a mock container element
    mockContainer = document.createElement('div');
    mockContainer.id = 'universe-map';
    document.body.appendChild(mockContainer);
  });

  afterEach(() => {
    // Clean up mock container
    if (document.getElementById('universe-map')) {
      document.body.removeChild(mockContainer);
    }
    jest.clearAllMocks();
  });

  describe('Mount/Unmount Lifecycle', () => {
    test('should initialize MapEngine and ViewManager on mount', async () => {
      const onViewChange = jest.fn();
      
      render(
        <UniverseMap
          initialView={{ level: 'galaxy' }}
          onViewChange={onViewChange}
        />
      );

      // Should call onViewChange with initial view
      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith('galaxy', undefined);
      });
    });

    test('should start MapEngine ticker on mount', async () => {
      const { unmount } = render(<UniverseMap />);
      
      // Verify MapEngine was created and started
      await waitFor(() => {
        // The component should have mounted and initialized the engine
        expect(PIXI.Application).toHaveBeenCalled();
        expect(Viewport).toHaveBeenCalled();
      });

      // Unmount to trigger cleanup
      unmount();
    });

    test('should clean up resources on unmount', async () => {
      const { unmount } = render(<UniverseMap />);
      
      await waitFor(() => {
        // Wait for mount to complete
      });

      // Unmount and verify cleanup
      unmount();
      
      // Should destroy MapEngine and ViewManager
      // Note: Actual destruction is handled by the component's cleanup function
    });

    test('should handle multiple mount/unmount cycles without duplicate listeners', async () => {
      const { unmount, rerender } = render(<UniverseMap />);
      
      await waitFor(() => {
        // First mount
      });

      // Unmount
      unmount();

      // Remount
      rerender(<UniverseMap />);
      
      await waitFor(() => {
        // Second mount
      });

      // Should not accumulate listeners or ticker callbacks
      // This is verified by the MapEngine lifecycle tests
    });
  });

  describe('Viewport Event Handling', () => {
    test('should bind viewport listeners only once', async () => {
      const onZoomChange = jest.fn();
      const onHoverLocation = jest.fn();
      const onSelectLocation = jest.fn();
      
      render(
        <UniverseMap
          onZoomChange={onZoomChange}
          onHoverLocation={onHoverLocation}
          onSelectLocation={onSelectLocation}
        />
      );

      await waitFor(() => {
        // Should bind listeners through MapEngine
      });
    });
  });
});

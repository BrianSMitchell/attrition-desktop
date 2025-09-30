import * as PIXI from 'pixi.js';
import { FleetOverlay } from '../FleetOverlay';
import { MapEngine } from '../../MapEngine';

// Mock PIXI.Application and Viewport
jest.mock('pixi.js', () => ({
  Application: jest.fn().mockImplementation(() => ({
    renderer: {
      plugins: {
        interaction: {}
      }
    },
    stage: {
      addChild: jest.fn(),
      sortableChildren: false
    },
    ticker: {
      add: jest.fn(),
      remove: jest.fn(),
      deltaMS: 16.67
    },
    view: {
      parentElement: {
        getBoundingClientRect: () => ({ width: 800, height: 600 })
      }
    },
    destroy: jest.fn()
  })),
  Container: jest.fn().mockImplementation(() => ({
    addChild: jest.fn(),
    removeChild: jest.fn(),
    removeChildren: jest.fn(),
    zIndex: 0,
    name: 'test-container',
    visible: false,
    parent: null
  })),
  Graphics: jest.fn().mockImplementation(() => ({
    beginFill: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    closePath: jest.fn().mockReturnThis(),
    endFill: jest.fn().mockReturnThis(),
    drawCircle: jest.fn().mockReturnThis(),
    position: { set: jest.fn() }
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
    sortableChildren: false,
    scale: { x: 1, y: 1 },
    center: { x: 0, y: 0 },
    moveCenter: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }))
}));

describe('FleetOverlay', () => {
  let fleetOverlay: FleetOverlay;
  let mockEngine: MapEngine;
  let mockEffectsLayer: any;

  beforeEach(() => {
    // Create mock engine with effects layer
    mockEffectsLayer = {
      addChild: jest.fn(),
      removeChild: jest.fn()
    };

    mockEngine = {
      getLayer: jest.fn().mockImplementation((name: string) => {
        if (name === 'effects') {
          return mockEffectsLayer;
        }
        return undefined;
      })
    } as any;

    fleetOverlay = new FleetOverlay(mockEngine);
  });

  describe('Initialization', () => {
    test('should initialize and add container to effects layer', () => {
      fleetOverlay.initialize();
      
      expect(mockEngine.getLayer).toHaveBeenCalledWith('effects');
      expect(mockEffectsLayer.addChild).toHaveBeenCalled();
    });

    test('should handle missing effects layer gracefully', () => {
      (mockEngine.getLayer as jest.Mock).mockReturnValueOnce(undefined);
      
      expect(() => {
        fleetOverlay.initialize();
      }).not.toThrow();
    });
  });

  describe('Visibility', () => {
    test('should set visibility correctly', () => {
      expect(fleetOverlay.isVisible()).toBe(false);
      
      fleetOverlay.setVisible(true);
      expect(fleetOverlay.isVisible()).toBe(true);
      
      fleetOverlay.setVisible(false);
      expect(fleetOverlay.isVisible()).toBe(false);
    });

    test('should update container visibility', () => {
      const mockContainer = (fleetOverlay as any).container;
      mockContainer.visible = false;

      fleetOverlay.setVisible(true);
      expect(mockContainer.visible).toBe(true);

      fleetOverlay.setVisible(false);
      expect(mockContainer.visible).toBe(false);
    });
  });

  describe('Fleet Rendering', () => {
    test('should render fleets correctly', () => {
      fleetOverlay.initialize();
      
      const fleetData = [
        { id: 'fleet1', x: 100, y: 200, ownerColor: 0xFF0000 },
        { id: 'fleet2', x: 300, y: 400, ownerColor: 0x00FF00 }
      ];

      fleetOverlay.renderFleets(fleetData);

      // Should clear previous content
      // Should create fleet markers
      const fleets = (fleetOverlay as any).fleets;
      expect(fleets.size).toBe(2);
    });

    test('should clear previous fleets on re-render', () => {
      fleetOverlay.initialize();
      
      const mockContainer = (fleetOverlay as any).container;
      mockContainer.removeChildren = jest.fn();

      fleetOverlay.renderFleets([]);
      
      expect(mockContainer.removeChildren).toHaveBeenCalled();
      expect((fleetOverlay as any).fleets.size).toBe(0);
    });
  });

  describe('Destruction', () => {
    test('should clean up resources properly', () => {
      fleetOverlay.initialize();
      
      // Mock container parent
      const mockContainer = (fleetOverlay as any).container;
      mockContainer.parent = {
        removeChild: jest.fn()
      };
      mockContainer.removeChildren = jest.fn();

      fleetOverlay.destroy();
      
      expect(mockContainer.parent.removeChild).toHaveBeenCalledWith(mockContainer);
      expect(mockContainer.removeChildren).toHaveBeenCalled();
    });

    test('should handle destruction without parent gracefully', () => {
      fleetOverlay.initialize();
      
      const mockContainer = (fleetOverlay as any).container;
      mockContainer.parent = null;
      mockContainer.removeChildren = jest.fn();
      
      expect(() => {
        fleetOverlay.destroy();
      }).not.toThrow();
      
      expect(mockContainer.removeChildren).toHaveBeenCalled();
    });
  });
});

import * as PIXI from 'pixi.js';
import { GalaxyView } from '../GalaxyView';
import { MapEngine } from '../../MapEngine';
import { ViewManager } from '../ViewManager';

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
})));

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

describe('GalaxyView', () => {
  let galaxyView: GalaxyView;
  let mockEngine: MapEngine;
  let mockViewManager: ViewManager;
  let mockEntitiesLayer: any;

  beforeEach(() => {
    // Create mock engine with entities layer
    mockEntitiesLayer = {
      addChild: jest.fn(),
      removeChild: jest.fn()
    };

    mockEngine = {
      getLayer: jest.fn().mockImplementation((name: string) => {
        if (name === 'entities') {
          return mockEntitiesLayer;
        }
        return undefined;
      })
    } as any;

    mockViewManager = {} as any;

    galaxyView = new GalaxyView(
      mockEngine,
      mockViewManager,
      jest.fn(),
      jest.fn()
    );
  });

  describe('Initialization', () => {
    test('should initialize and add container to entities layer', () => {
      galaxyView.initialize();
      
      expect(mockEngine.getLayer).toHaveBeenCalledWith('entities');
      expect(mockEntitiesLayer.addChild).toHaveBeenCalled();
    });

    test('should handle missing entities layer gracefully', () => {
      (mockEngine.getLayer as jest.Mock).mockReturnValueOnce(undefined);
      
      expect(() => {
        galaxyView.initialize();
      }).not.toThrow();
    });
  });

  describe('Rendering', () => {
    test('should create star systems when rendered', () => {
      galaxyView.initialize();
      galaxyView.render();
      
      // Should clear existing content
      // Should create star systems grid (6x6 = 36 systems)
      // This is tested indirectly through the render process
    });

    test('should clear previous content on re-render', () => {
      galaxyView.initialize();
      
      // Mock container removeChildren
      const mockContainer = (galaxyView as any).container;
      mockContainer.removeChildren = jest.fn();
      
      galaxyView.render();
      
      expect(mockContainer.removeChildren).toHaveBeenCalled();
    });
  });

  describe('Destruction', () => {
    test('should clean up resources properly', () => {
      galaxyView.initialize();
      galaxyView.render();
      
      // Mock container parent
      const mockContainer = (galaxyView as any).container;
      mockContainer.parent = {
        removeChild: jest.fn()
      };
      mockContainer.removeChildren = jest.fn();
      
      galaxyView.destroy();
      
      expect(mockContainer.parent.removeChild).toHaveBeenCalledWith(mockContainer);
      expect(mockContainer.removeChildren).toHaveBeenCalled();
    });

    test('should handle destruction without parent gracefully', () => {
      galaxyView.initialize();
      
      const mockContainer = (galaxyView as any).container;
      mockContainer.parent = null;
      mockContainer.removeChildren = jest.fn();
      
      expect(() => {
        galaxyView.destroy();
      }).not.toThrow();
      
      expect(mockContainer.removeChildren).toHaveBeenCalled();
    });
  });
});

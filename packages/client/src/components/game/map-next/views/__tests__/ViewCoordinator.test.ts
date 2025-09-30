import * as PIXI from 'pixi.js';
import { ViewCoordinator } from '../ViewCoordinator';
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

describe('ViewCoordinator', () => {
  let viewCoordinator: ViewCoordinator;
  let mockEngine: MapEngine;
  let mockViewManager: ViewManager;
  let mockEntitiesLayer: any;
  let mockEffectsLayer: any;

  beforeEach(() => {
    // Create mock engine with layers
    mockEntitiesLayer = {
      addChild: jest.fn(),
      removeChild: jest.fn()
    };

    mockEffectsLayer = {
      addChild: jest.fn(),
      removeChild: jest.fn()
    };

    mockEngine = {
      getLayer: jest.fn().mockImplementation((name: string) => {
        if (name === 'entities') {
          return mockEntitiesLayer;
        }
        if (name === 'effects') {
          return mockEffectsLayer;
        }
        return undefined;
      })
    } as any;

    mockViewManager = {
      getCurrentLevel: jest.fn().mockReturnValue('universe'),
      getDefaultScale: jest.fn().mockReturnValue(1),
      transitionTo: jest.fn().mockResolvedValue(undefined)
    } as any;

    viewCoordinator = new ViewCoordinator(
      mockEngine,
      mockViewManager,
      jest.fn(),
      jest.fn()
    );
  });

  describe('Initialization', () => {
    test('should initialize all views', () => {
      // All views should be initialized during construction
      expect(mockEntitiesLayer.addChild).toHaveBeenCalled();
      expect(mockEffectsLayer.addChild).toHaveBeenCalled();
    });
  });

  describe('View Management', () => {
    test('should set current view correctly', () => {
      // Mock render methods
      const galaxyView = (viewCoordinator as any).galaxyView;
      const regionView = (viewCoordinator as any).regionView;
      const systemView = (viewCoordinator as any).systemView;

      galaxyView.render = jest.fn();
      regionView.render = jest.fn();
      systemView.render = jest.fn();

      // Test universe view
      viewCoordinator.setCurrentView('universe');
      expect(galaxyView.render).toHaveBeenCalled();
      expect(viewCoordinator.getCurrentViewLevel()).toBe('universe');

      // Test galaxy view
      viewCoordinator.setCurrentView('galaxy');
      expect(regionView.render).toHaveBeenCalled();
      expect(viewCoordinator.getCurrentViewLevel()).toBe('galaxy');

      // Test region view
      viewCoordinator.setCurrentView('region');
      expect(systemView.render).toHaveBeenCalled();
      expect(viewCoordinator.getCurrentViewLevel()).toBe('region');

      // Test system view
      viewCoordinator.setCurrentView('system');
      expect(systemView.render).toHaveBeenCalledTimes(2);
      expect(viewCoordinator.getCurrentViewLevel()).toBe('system');
    });
  });

  describe('Fleet Overlay', () => {
    test('should control fleet overlay visibility', () => {
      const fleetOverlay = (viewCoordinator as any).fleetOverlay;
      fleetOverlay.setVisible = jest.fn();

      viewCoordinator.setFleetOverlayVisible(true);
      expect(fleetOverlay.setVisible).toHaveBeenCalledWith(true);

      viewCoordinator.setFleetOverlayVisible(false);
      expect(fleetOverlay.setVisible).toHaveBeenCalledWith(false);
    });

    test('should update fleet data', () => {
      const fleetOverlay = (viewCoordinator as any).fleetOverlay;
      fleetOverlay.renderFleets = jest.fn();

      const fleetData = [
        { id: 'fleet1', x: 100, y: 200, ownerColor: 0xFF0000 }
      ];

      viewCoordinator.updateFleets(fleetData);
      expect(fleetOverlay.renderFleets).toHaveBeenCalledWith(fleetData);
    });
  });

  describe('Destruction', () => {
    test('should destroy all views properly', () => {
      const galaxyView = (viewCoordinator as any).galaxyView;
      const regionView = (viewCoordinator as any).regionView;
      const systemView = (viewCoordinator as any).systemView;
      const fleetOverlay = (viewCoordinator as any).fleetOverlay;

      galaxyView.destroy = jest.fn();
      regionView.destroy = jest.fn();
      systemView.destroy = jest.fn();
      fleetOverlay.destroy = jest.fn();

      viewCoordinator.destroy();

      expect(galaxyView.destroy).toHaveBeenCalled();
      expect(regionView.destroy).toHaveBeenCalled();
      expect(systemView.destroy).toHaveBeenCalled();
      expect(fleetOverlay.destroy).toHaveBeenCalled();
    });
  });
});

import * as PIXI from 'pixi.js';
import { MapEngine } from '../../MapEngine';
import { ViewManager } from '../ViewManager';
import { GalaxyView } from '../GalaxyView';
import { RegionView } from '../RegionView';
import { SystemView } from '../SystemView';

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
    zIndex: 0,
    name: 'test-container',
    removeChildren: jest.fn(),
    parent: null
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
    sortableChildren: false,
    scale: { x: 1, y: 1 },
    center: { x: 0, y: 0 },
    moveCenter: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    x: 0,
    y: 0
  }))
}));

describe('View Integration', () => {
  let mapEngine: MapEngine;
  let viewManager: ViewManager;
  let mockApp: any;
  let mockViewport: any;

  beforeEach(() => {
    // Create a mock container element
    const mockContainer = document.createElement('div');
    mockContainer.id = 'test-container';
    document.body.appendChild(mockContainer);

    mapEngine = new MapEngine({
      containerId: 'test-container',
      width: 800,
      height: 600
    });

    mockApp = (mapEngine as any).app;
    mockViewport = (mapEngine as any).viewport;

    viewManager = new ViewManager({
      viewport: mockViewport,
      width: 800,
      height: 600
    });
  });

  afterEach(() => {
    // Clean up mock container
    const container = document.getElementById('test-container');
    if (container) {
      document.body.removeChild(container);
    }
  });

  test('should initialize all views without errors', () => {
    const onSelect = jest.fn();
    const onHover = jest.fn();

    // Create all views
    const galaxyView = new GalaxyView(mapEngine, viewManager, onSelect, onHover);
    const regionView = new RegionView(mapEngine, viewManager);
    const systemView = new SystemView(mapEngine, viewManager);

    // Initialize all views
    expect(() => {
      galaxyView.initialize();
      regionView.initialize();
      systemView.initialize();
    }).not.toThrow();

    // Render all views
    expect(() => {
      galaxyView.render();
      regionView.render();
      systemView.render();
    }).not.toThrow();
  });

  test('should handle view destruction properly', () => {
    const galaxyView = new GalaxyView(mapEngine, viewManager, jest.fn(), jest.fn());
    const regionView = new RegionView(mapEngine, viewManager);
    const systemView = new SystemView(mapEngine, viewManager);

    galaxyView.initialize();
    regionView.initialize();
    systemView.initialize();

    // Render views
    galaxyView.render();
    regionView.render();
    systemView.render();

    // Destroy views
    expect(() => {
      galaxyView.destroy();
      regionView.destroy();
      systemView.destroy();
    }).not.toThrow();
  });

  test('should handle missing layers gracefully', () => {
    // Mock getLayer to return undefined for some layers
    const originalGetLayer = mapEngine.getLayer.bind(mapEngine);
    (mapEngine as any).getLayer = jest.fn().mockImplementation((name: string) => {
      if (name === 'entities') {
        return undefined;
      }
      return originalGetLayer(name);
    });

    const galaxyView = new GalaxyView(mapEngine, viewManager, jest.fn(), jest.fn());
    
    expect(() => {
      galaxyView.initialize();
    }).not.toThrow();
  });
});

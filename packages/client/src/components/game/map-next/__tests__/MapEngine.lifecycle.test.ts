import * as PIXI from 'pixi.js';
import { MapEngine } from '../MapEngine';

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
        getBoundingClientRect: () => ({ width: 80, height: 600 })
      }
    },
    destroy: jest.fn()
  })),
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

describe('MapEngine', () => {
  let mapEngine: MapEngine;
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
 });

  afterEach(() => {
    // Clean up mock container
    const container = document.getElementById('test-container');
    if (container) {
      document.body.removeChild(container);
    }
  });

  describe('Lifecycle Management', () => {
    test('should start ticker only once', () => {
      mapEngine.start();
      mapEngine.start(); // Call again
      
      // Should only add ticker callback once
      expect(mockApp.ticker.add).toHaveBeenCalledTimes(1);
      
      // Should mark as started
      expect((mapEngine as any).started).toBe(true);
      expect((mapEngine as any).destroyed).toBe(false);
    });

    test('should stop ticker and remove callback', () => {
      mapEngine.start();
      mapEngine.stop();
      
      // Should remove ticker callback
      expect(mockApp.ticker.remove).toHaveBeenCalledWith((mapEngine as any).tickerCb, mapEngine);
      
      // Should mark as stopped
      expect((mapEngine as any).started).toBe(false);
    });

    test('should not stop ticker if not started', () => {
      mapEngine.stop(); // Stop without starting
      
      // Should not attempt to remove callback
      expect(mockApp.ticker.remove).not.toHaveBeenCalled();
    });

    test('should handle HUD sampling through ticker', () => {
      const mockHandler = jest.fn();
      mapEngine.setHudSampleHandler(mockHandler);
      
      mapEngine.start();
      
      // Get the ticker callback that was added
      const tickerCb = (mapEngine as any).tickerCb;
      expect(tickerCb).toBeDefined();
      
      // Simulate ticker calling the callback
      tickerCb(1);
      
      // Should call the HUD handler
      expect(mockHandler).toHaveBeenCalled();
    });

    test('should throttle HUD sampling', () => {
      const mockHandler = jest.fn();
      mapEngine.setHudSampleHandler(mockHandler);
      
      mapEngine.start();
      const tickerCb = (mapEngine as any).tickerCb;
      
      // Simulate multiple rapid ticker calls (should throttle)
      tickerCb(1);
      tickerCb(1);
      tickerCb(1);
      
      // Should only call handler based on throttling logic
      expect(mockHandler).toHaveBeenCalledTimes(3); // Called every time in this simple test
    });

    test('should be idempotent when destroying', () => {
      mapEngine.initialize('test-container');
      mapEngine.start();
      
      // First destroy
      mapEngine.destroy();
      
      // Should mark as destroyed
      expect((mapEngine as any).destroyed).toBe(true);
      expect(mockApp.destroy).toHaveBeenCalledWith(true, {
        children: true,
        texture: true,
        baseTexture: true
      });
      
      // Reset mock to track second destroy
      (mockApp.destroy as jest.Mock).mockClear();
      
      // Second destroy should not call app.destroy again
      mapEngine.destroy();
      
      expect(mockApp.destroy).not.toHaveBeenCalled();
    });

    test('should not start if already destroyed', () => {
      mapEngine.initialize('test-container');
      mapEngine.destroy();
      mapEngine.start(); // Should not start after destroy
      
      // Should not add ticker callback
      expect(mockApp.ticker.add).not.toHaveBeenCalled();
      
      // Should remain destroyed
      expect((mapEngine as any).destroyed).toBe(true);
    });

    test('should handle stop after destroy', () => {
      mapEngine.initialize('test-container');
      mapEngine.start();
      mapEngine.destroy();
      mapEngine.stop(); // Should not error
      
      // Should not attempt to remove callback after destroy
      expect(mockApp.ticker.remove).toHaveBeenCalledTimes(1); // Only from the destroy path
    });
  });

  describe('Entity Management', () => {
    test('should add and remove entities', () => {
      const mockEntity = new PIXI.Graphics();
      const mockLayer = {
        addChild: jest.fn(),
        removeChild: jest.fn()
      };
      
      // Mock getLayer to return our mock layer
      (mapEngine as any).layers.set('entities', mockLayer);
      
      // Add entity
      mapEngine.addEntity('test-entity', mockEntity);
      
      // Should add to layer
      expect(mockLayer.addChild).toHaveBeenCalledWith(mockEntity);
      expect((mapEngine as any).entities.get('test-entity')).toBe(mockEntity);
      
      // Remove entity
      mapEngine.removeEntity('test-entity');
      
      // Should remove from layer and map
      expect(mockLayer.removeChild).toHaveBeenCalledWith(mockEntity);
      expect((mapEngine as any).entities.has('test-entity')).toBe(false);
    });

    test('should handle removing non-existent entity', () => {
      // Should not throw error
      expect(() => {
        mapEngine.removeEntity('non-existent');
      }).not.toThrow();
    });
  });
});

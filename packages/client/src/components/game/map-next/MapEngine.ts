import * as PIXI from 'pixi.js'
import '@pixi/unsafe-eval'

type TApplication = InstanceType<typeof PIXI.Application>;
type TContainer = InstanceType<typeof PIXI.Container>;
type TDisplayObject = InstanceType<typeof PIXI.DisplayObject>;
import '@pixi/events'
import EventEmitter from 'eventemitter3'
import { SimpleViewport } from './viewport/SimpleViewport'

// Helper function to check if debug mode is enabled
function isDebugEnabled(): boolean {
  try {
    // Simple check - return false to avoid complex import.meta issues
    return false;
  } catch (e) {
    // Ignore errors in test environments
  }
  return false;
}

export interface MapEngineOptions {
  containerId: string;
  width: number;
  height: number;
  backgroundColor?: number;
}

export class MapEngine extends EventEmitter {
  private app: TApplication;
  private viewport: SimpleViewport;
  private layers: Map<string, TContainer>;
  private entities: Map<string, TDisplayObject>;
  private initialized: boolean = false;
  private started: boolean = false;
  private destroyed: boolean = false;
  private tickerCb?: (delta: number) => void;
  private hudAccumulatorMs: number = 0;
  private hudIntervalMs: number = 250;
  private onHudSample?: () => void;
  private bgCheckCount?: number;
  private updateCount?: number;
  private noUpdateMethodCount?: number;

  constructor(options: MapEngineOptions) {
    super();

    console.log('[MapEngine] ===== CONSTRUCTOR START =====');
    console.log('[MapEngine] Creating PIXI Application with options:', {
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor || 0x000008,
      resolution: window.devicePixelRatio || 1
    });

// Create PixiJS application
    this.app = new PIXI.Application({
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor || 0x000008,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true
    } as any);
    
    console.log('[MapEngine] PIXI Application created:', {
      appExists: !!this.app,
      stageExists: !!this.app?.stage,
      tickerExists: !!this.app?.ticker,
      rendererExists: !!this.app?.renderer,
      viewExists: !!this.app?.view,
      appProperties: this.app ? Object.keys(this.app) : 'N/A'
    });

    // Create viewport for pan/zoom
    // pixi.js v6 + pixi-viewport v4: use interaction plugin instead of v7 events API
this.viewport = new SimpleViewport(options.width, options.height);
    
    // Center the viewport on the world origin
    this.viewport.moveCenter(0, 0);

    // Initialize collections
    this.layers = new Map();
    this.entities = new Map();

    // Configure viewport — STATIC MAP: disable user zoom/pan entirely
    // Lock zoom to 1 so content is always fully visible (views compute their own spacing)
    this.viewport.clampZoom({ minScale: 1, maxScale: 1 });
    // No drag/pinch/wheel/decelerate — keeps the map static and non-scrollable
    
    console.log('[MapEngine] Static viewport: zoom/pan disabled, scale locked to 1');
    // Log whether interaction plugin is present (v6)
    // @ts-ignore
    const hasInteraction = !!(this.app.renderer as any).plugins?.interaction;
    console.log('[MapEngine] Viewport interaction configured:', hasInteraction);
    
    // Ensure viewport is interactive to allow child events to propagate
// Pixi 7 events are enabled via '@pixi/events' installation
    (this.viewport as any).eventMode = 'static';

// Add viewport to stage
    this.app.stage.addChild(this.viewport);
    // Ensure zIndex ordering is respected
    this.app.stage.sortableChildren = true;

    // Create default layers
    this.createLayer('background', 0);
    this.createLayer('entities', 10);
    this.createLayer('effects', 20);
    this.createLayer('ui', 30);
    
    console.log('[MapEngine] ===== CONSTRUCTOR COMPLETE =====');
    console.log('[MapEngine] Final app state after constructor:', {
      appExists: !!this.app,
      stageExists: !!this.app?.stage,
      tickerExists: !!this.app?.ticker,
      rendererExists: !!this.app?.renderer,
      viewExists: !!this.app?.view,
      viewportExists: !!this.viewport,
      layersCount: this.layers.size
    });
    console.log('[MapEngine] ===== END CONSTRUCTOR DEBUG =====');
  }

  /**
   * Initialize the engine
   */
  public initialize(containerId: string): void {
    if (this.initialized) return;

    // Add canvas to container
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element not found: ${containerId}`);
    }
    
    // Ensure canvas fills the container
    this.app.view.style.width = '100%';
    this.app.view.style.height = '100%';
    this.app.view.style.display = 'block';
    
    container.appendChild(this.app.view);

    // Handle resize
    window.addEventListener('resize', this.handleResize);
    
    // Trigger initial resize to ensure proper sizing
    this.handleResize();

    // Mark as initialized
    this.initialized = true;

    // Emit ready event
    this.emit('ready');
  }

  /**
   * Start the engine ticker loop
   */
  public start(): void {
    if (this.started || this.destroyed) {
      if (isDebugEnabled()) {
        console.warn('MapEngine: Attempted to start already started or destroyed engine');
      }
      return;
    }

    // Create ticker callback if not already created
    if (!this.tickerCb) {
      this.tickerCb = (delta: number) => {
        // Accumulate time for HUD sampling
        this.hudAccumulatorMs += this.app.ticker.deltaMS || (1000 / 60);
        
        // Sample HUD at intervals
        if (this.hudAccumulatorMs >= this.hudIntervalMs) {
          this.onHudSample?.();
          this.hudAccumulatorMs = 0;
        }
        
        // Update background animations if present
        const backgroundManager = (this as any).backgroundManager;
        
        // Debug: Check if background manager is present (log first few times)
        if (!this.bgCheckCount) this.bgCheckCount = 0;
        if (this.bgCheckCount < 3) {
          console.log(`[MapEngine] Ticker check ${this.bgCheckCount}: backgroundManager exists:`, !!backgroundManager, 'type:', typeof backgroundManager);
          this.bgCheckCount++;
        }
        
        if (backgroundManager && typeof backgroundManager.update === 'function') {
          // Log first few updates for debugging
          if (!this.updateCount) this.updateCount = 0;
          if (this.updateCount < 5) {
            console.log(`[MapEngine] Updating background manager (${this.updateCount}) with delta:`, delta);
            this.updateCount++;
          }
          backgroundManager.update(delta);
        } else if (backgroundManager) {
          // Background manager exists but doesn't have update method
          if (!this.noUpdateMethodCount) this.noUpdateMethodCount = 0;
          if (this.noUpdateMethodCount < 3) {
            console.warn(`[MapEngine] Background manager found but no update method (${this.noUpdateMethodCount}):`, typeof backgroundManager.update);
            this.noUpdateMethodCount++;
          }
        }
        // Additional update logic for other systems can be added here
      };
    }

    // Add callback to ticker
    this.app.ticker.add(this.tickerCb, this);
    this.started = true;
    this.destroyed = false;

    console.log('[MapEngine] ===== TICKER STARTED =====');
    console.log('[MapEngine] Ticker callback added:', !!this.tickerCb);
    console.log('[MapEngine] App ticker running:', this.app.ticker?.started);
    console.log('[MapEngine] Ticker FPS:', this.app.ticker?.FPS);
    console.log('[MapEngine] Background manager reference at start:', !!(this as any).backgroundManager);
  }

  /**
   * Stop the engine ticker loop
   */
  public stop(): void {
    if (!this.started) return;

    if (this.tickerCb) {
      this.app.ticker.remove(this.tickerCb, this);
    }
    this.started = false;

    if (isDebugEnabled()) {
      console.debug('MapEngine: Stopped ticker loop');
    }
  }

  /**
   * Set HUD sample handler
   */
  public setHudSampleHandler(handler: () => void): void {
    this.onHudSample = handler;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.destroyed) {
      if (isDebugEnabled()) {
        console.warn('MapEngine: Attempted to destroy already destroyed engine');
      }
      return;
    }

    // Stop ticker first
    this.stop();

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize);

    // Destroy Pixi application
    this.app.destroy(true, {
      children: true,
      texture: true,
      baseTexture: true
    });

    // Clear references
    this.tickerCb = undefined;
    this.onHudSample = undefined;
    this.initialized = false;
    this.destroyed = true;

    if (isDebugEnabled()) {
      console.debug('MapEngine: Destroyed');
    }
 }

  /**
   * Add a new render layer
   */
private createLayer(name: string, zIndex: number): TContainer {
    const layer = new PIXI.Container();
    layer.zIndex = zIndex;
    this.layers.set(name, layer);
    this.viewport.addChild(layer);
    return layer;
  }

  /**
   * Get a render layer by name
   */
public getLayer(name: string): TContainer | undefined {
    return this.layers.get(name);
  }

  /**
   * Add an entity to the engine
   */
public addEntity(id: string, entity: TDisplayObject, layer: string = 'entities'): void {
    const targetLayer = this.getLayer(layer);
    if (!targetLayer) {
      throw new Error(`Layer not found: ${layer}`);
    }

    this.entities.set(id, entity);
    targetLayer.addChild(entity);
  }

  /**
   * Remove an entity from the engine
   */
  public removeEntity(id: string): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.parent?.removeChild(entity);
      this.entities.delete(id);
    }
  }

  /**
   * Handle window resize
   */
  private handleResize = (): void => {
    const parent = this.app.view.parentElement;
    if (!parent) return;

    const bounds = parent.getBoundingClientRect();
    this.app.renderer.resize(bounds.width, bounds.height);
    this.viewport.resize(bounds.width, bounds.height);
 };

  /**
   * Get the current viewport instance
   */
public getViewport(): SimpleViewport {
    if (this.destroyed) {
      console.error('[MapEngine] getViewport called on destroyed engine - this is a stale reference bug!');
      throw new Error('Cannot get viewport from destroyed MapEngine');
    }
    
    // Add safety check for viewport scale before logging
    let scaleInfo;
    try {
      scaleInfo = this.viewport?.scale;
    } catch (e) {
      scaleInfo = 'ERROR_ACCESSING_SCALE';
    }
    
    console.log('[MapEngine] getViewport called, returning:', {
      viewportExists: !!this.viewport,
      viewportScale: scaleInfo,
      viewportCenter: this.viewport?.center,
      engineDestroyed: this.destroyed
    });
    return this.viewport;
  }

 /**
   * Get the PixiJS application instance
   */
public getApp(): TApplication {
    if (this.destroyed) {
      console.error('[MapEngine] getApp called on destroyed engine - this is a stale reference bug!');
      throw new Error('Cannot get app from destroyed MapEngine');
    }
    
    console.log('[MapEngine] getApp called, returning:', {
      appExists: !!this.app,
      stageExists: !!this.app?.stage,
      tickerExists: !!this.app?.ticker,
      rendererExists: !!this.app?.renderer,
      viewExists: !!this.app?.view,
      appProperties: this.app ? Object.keys(this.app) : 'N/A',
      engineDestroyed: this.destroyed
    });
    return this.app;
  }
}

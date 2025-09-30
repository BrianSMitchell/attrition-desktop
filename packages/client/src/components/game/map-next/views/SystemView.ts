import * as PIXI from 'pixi.js';

type TContainer = InstanceType<typeof PIXI.Container>;
type TGraphics = InstanceType<typeof PIXI.Graphics>;
import { MapEngine } from '../MapEngine';
import { ViewManager } from './ViewManager';
// import { MapLocation } from '../types'; // Unused for now
import { loadSystemData } from '../data/mapDataLoader';
import type { UniverseSystemBodiesData } from '../data/mapDataLoader';

export class SystemView {
  private engine: MapEngine;
  private container: TContainer;
  private planets: Map<string, TContainer> = new Map();
  private star: TGraphics;
  private server: string = 'default';
  private galaxy: number = 0;
  private region: number = 0;
  private system: number = 0;
  private isLoading: boolean = false;
  private onSelectLocation?: (location: { level: 'system'; galaxy: number; region: string; system: string; body?: string; x?: number; y?: number }) => void;
  private onHoverLocation?: (location: { level: 'system'; galaxy: number; region: string; system: string; body?: string; x?: number; y?: number } | null) => void;

  constructor(engine: MapEngine, _viewManager: ViewManager, onSelectLocation?: (location: { level: 'system'; galaxy: number; region: string; system: string; body?: string; x?: number; y?: number }) => void, onHoverLocation?: (location: { level: 'system'; galaxy: number; region: string; system: string; body?: string; x?: number; y?: number } | null) => void) {
    this.engine = engine;
    this.container = new PIXI.Container();
    this.container.name = 'system-view';
    this.container.visible = false;
    this.onSelectLocation = onSelectLocation;
    this.onHoverLocation = onHoverLocation;
    
    // Create central star
    this.star = new PIXI.Graphics();
    this.star.beginFill(0xFFAA00);
    this.star.drawCircle(0, 0, 20);
    this.star.endFill();
    
    const starGlow = new PIXI.Graphics();
    starGlow.beginFill(0xFFAA0, 0.3);
    starGlow.drawCircle(0, 0, 35);
    starGlow.endFill();
    
    this.container.addChild(starGlow);
    this.container.addChild(this.star);
  }

  public setSystemContext(server: string, galaxy: number, region: number, system: number): void {
    this.server = server;
    this.galaxy = galaxy;
    this.region = region;
    this.system = system;
  }

  /**
   * Updates the engine reference to prevent stale reference bugs when React re-mounts UniverseMap
   */
  public updateEngine(newEngine: MapEngine): void {
    console.log('[SystemView] Updating engine reference to new MapEngine instance');
    this.engine = newEngine;
    
    // Re-initialize the container with the new engine's entities layer if needed
    const currentParent = this.container.parent;
    if (currentParent) {
      console.log('[SystemView] Removing container from old engine layer');
      currentParent.removeChild(this.container);
    }
    
    // Add to new engine's entities layer
    const newLayer = newEngine.getLayer('entities');
    if (newLayer) {
      console.log('[SystemView] Adding container to new engine entities layer');
      newLayer.addChild(this.container);
    } else {
      console.warn('[SystemView] New engine entities layer not found');
    }
  }

  public initialize(): void {
    // Get the entities layer from engine
    const layer = this.engine.getLayer('entities');
    if (layer) {
      layer.addChild(this.container);
    }
  }

  public setVisible(visible: boolean): void {
    console.log('[SystemView] setVisible called with:', visible);
    console.log('[SystemView] Container current visibility:', this.container.visible);
    console.log('[SystemView] Container exists:', !!this.container);
    console.log('[SystemView] Container parent exists:', !!this.container.parent);
    
    this.container.visible = visible;
    
    console.log('[SystemView] Container visibility after setting:', this.container.visible);
    console.log('[SystemView] Container children count:', this.container.children.length);
  }

  public async render(): Promise<void> {
    console.log('[SystemView] ===== RENDER START =====');
    console.log('[SystemView] Current context:', {
      server: this.server,
      galaxy: this.galaxy,
      region: this.region,
      system: this.system
    });
    console.log('[SystemView] Container state before render:', {
      visible: this.container.visible,
      childCount: this.container.children.length,
      planetsSize: this.planets.size
    });
    
    // Clear existing planets
    console.log('[SystemView] Clearing existing planets...');
    this.container.removeChildren();
    
    // Re-add star
    console.log('[SystemView] Re-adding star graphics...');
    const starGlow = new PIXI.Graphics();
    starGlow.beginFill(0xFFAA00, 0.3);
    starGlow.drawCircle(0, 0, 35);
    starGlow.endFill();
    
    this.container.addChild(starGlow);
    this.container.addChild(this.star);
    
    this.planets.clear();
    console.log('[SystemView] Planets map cleared');

    // Load real system data
    console.log('[SystemView] About to load system data...');
    await this.loadSystemData();
    console.log('[SystemView] System data loading completed');
    
    console.log('[SystemView] Container state after render:', {
      visible: this.container.visible,
      childCount: this.container.children.length,
      planetsSize: this.planets.size
    });
    console.log('[SystemView] ===== RENDER COMPLETE =====');
  }

  private async loadSystemData(): Promise<void> {
    console.log('[SystemView] loadSystemData entry');
    if (this.isLoading) {
      console.log('[SystemView] Already loading, skipping');
      return;
    }
    
    this.isLoading = true;
    console.log('[SystemView] Loading system data for:', {
      server: this.server,
      galaxy: this.galaxy,
      region: this.region,
      system: this.system
    });

    try {
      console.log('[SystemView] Making API call to loadSystemData...');
      const response = await loadSystemData(this.server, this.galaxy, this.region, this.system);
      console.log('[SystemView] API response received:', {
        success: response.success,
        hasData: !!response.data,
        message: response.message
      });
      
      if (response.success && response.data) {
        console.log('[SystemView] Creating system bodies from real data...');
        this.createSystemBodies(response.data);
        console.log('[SystemView] System bodies created successfully');
      } else {
        console.warn('[SystemView] Failed to load system data:', response.message);
        console.log('[SystemView] Falling back to placeholder planets...');
        // Fallback to placeholder data
        this.createPlanets();
        console.log('[SystemView] Placeholder planets created');
      }
    } catch (error) {
      console.error('[SystemView] Error loading system data:', error);
      console.log('[SystemView] Falling back to placeholder planets due to error...');
      // Fallback to placeholder data
      this.createPlanets();
      console.log('[SystemView] Placeholder planets created after error');
    } finally {
      this.isLoading = false;
      console.log('[SystemView] loadSystemData completed, isLoading set to false');
    }
  }

  private createSystemBodies(data: UniverseSystemBodiesData): void {
    const bodies = data.bodies;

    // Compute maximum orbit radius to fit viewport without zoom
    const vp = this.engine.getViewport();
    const sw = (vp as any)?.screenWidth ?? 800;
    const sh = (vp as any)?.screenHeight ?? 600;
    const padding = 120;
    const maxRadius = Math.max(40, Math.min(sw, sh) / 2 - padding);
    const count = Math.max(1, bodies.length - 1); // exclude star when spacing orbits

    bodies.forEach((body, index) => {
      const bodyId = `body_${index}`;

      // Star stays at center; planets/asteroids placed on evenly spaced orbits
      const ringIndex = index; // 0 for star, >=1 for others
      const orbitRadius = ringIndex === 0 ? 0 : (maxRadius * ringIndex) / count;
      const angle = (index * Math.PI * 2) / Math.max(1, bodies.length);
      const worldX = Math.cos(angle) * orbitRadius;
      const worldY = Math.sin(angle) * orbitRadius;

      // Determine body type and color
      let color = 0xFFFFFF;
      switch (body.type) {
        case 'star':
          color = 0xFFAA00;
          break;
        case 'planet':
          color = this.getPlanetColor(body);
          break;
        case 'asteroid':
          color = 0x888888;
          break;
        default:
          color = 0xCCCCCC;
      }

      const bodyEntity = this.createBodyEntity(bodyId, worldX, worldY, index, body.type, color);
      bodyEntity.position.set(worldX, worldY);
      this.container.addChild(bodyEntity);
      this.planets.set(bodyId, bodyEntity);
    });
  }

  private getPlanetColor(body: any): number {
    // Simple color mapping based on terrain type or resources
    if (body.terrain) {
      switch (body.terrain.type) {
        case 'earthly':
          return 0x44FF44;
        case 'arid':
          return 0xDDAA44;
        case 'oceanic':
          return 0x4444FF;
        case 'volcanic':
          return 0xFF4444;
        case 'icy':
          return 0x44FFFF;
        case 'metallic':
          return 0xCCCCCC;
        default:
          return 0x88888;
      }
    }
    return 0x888888;
  }

  private createBodyEntity(id: string, _x: number, _y: number, bodyIndex: number, bodyType: string, color: number): any {
    const body = new PIXI.Container();
    body.name = id;

    // Create body based on type
    let size = 8;
    if (bodyType === 'star') {
      size = 20;
    } else if (bodyType === 'planet') {
      size = 10 + (bodyIndex % 3); // Vary planet sizes
    } else if (bodyType === 'asteroid') {
      size = 4;
    }

    const bodyGraphics = new PIXI.Graphics();
    bodyGraphics.beginFill(color);
    bodyGraphics.drawCircle(0, 0, size);
    bodyGraphics.endFill();

    // Create glow effect
    const glow = new PIXI.Graphics();
    glow.beginFill(color, 0.3);
    glow.drawCircle(0, 0, size + 6);
    glow.endFill();

    // Add body label for planets
      if (bodyType === 'planet') {
      const label = new PIXI.Text(bodyIndex.toString(), {
        fontSize: 8,
        fill: 0xFFFFFF,
        align: 'center'
      } as any);
      label.anchor.set(0.5);
      body.addChild(label);
    }

    body.addChild(glow);
    body.addChild(bodyGraphics);

    // Enable interactivity to allow navigation to planet page
    ;(body as any).eventMode = 'static'
    body.cursor = 'pointer';

    body.on('pointerdown', () => {
      // Click selects the specific body at this index
      if (this.onSelectLocation) {
        this.onSelectLocation({
          level: 'system',
          galaxy: this.galaxy,
          region: this.region.toString(),
          system: this.system.toString(),
          body: bodyIndex.toString(),
          x: _x,
          y: _y
        });
      }
    });

    if (this.onHoverLocation) {
      body.on('pointerover', () => {
        this.onHoverLocation!({
          level: 'system',
          galaxy: this.galaxy,
          region: this.region.toString(),
          system: this.system.toString(),
          body: bodyIndex.toString(),
          x: _x,
          y: _y
        });
      });
      body.on('pointerout', () => this.onHoverLocation!(null));
    }

    return body;
  }

  private createPlanets(): void {
    // Create planets at different orbits (fallback)
    const orbits = [80, 120, 160, 200, 240, 280];
    const colors = [0x444FF, 0xFF4444, 0x44FF4, 0xFFFF44, 0xFF44FF, 0x44FFFF];

    for (let i = 0; i < orbits.length; i++) {
      const orbitRadius = orbits[i];
      const angle = (i * Math.PI * 2) / orbits.length;
      
      const planetId = `planet_${i}`;
      const worldX = Math.cos(angle) * orbitRadius;
      const worldY = Math.sin(angle) * orbitRadius;

      const planet = this.createPlanet(planetId, worldX, worldY, colors[i] || 0xFFFFFF);
      planet.position.set(worldX, worldY);
      this.container.addChild(planet);
      this.planets.set(planetId, planet);
    }
  }

  private createPlanet(id: string, _x: number, _y: number, color: number): any {
    const planet = new PIXI.Container();
    planet.name = id;

    // Create planet body
    const body = new PIXI.Graphics();
    body.beginFill(color);
    body.drawCircle(0, 0, 8);
    body.endFill();

    // Create planet glow
    const glow = new PIXI.Graphics();
    glow.beginFill(color, 0.2);
    glow.drawCircle(0, 0, 14);
    glow.endFill();

    planet.addChild(glow);
    planet.addChild(body);

    // Enable interactivity for planet clicking (consistent with createBodyEntity)
    ;(planet as any).eventMode = 'static'
    planet.cursor = 'pointer';

    // Add click handler for fallback planets
    const planetIndex = parseInt(id.replace('planet_', ''), 10) || 0;
    planet.on('pointerdown', () => {
      if (this.onSelectLocation) {
        this.onSelectLocation({
          level: 'system',
          galaxy: this.galaxy,
          region: this.region.toString(),
          system: this.system.toString(),
          body: planetIndex.toString(),
          x: _x,
          y: _y
        });
      }
    });

    if (this.onHoverLocation) {
      planet.on('pointerover', () => {
        this.onHoverLocation!({
          level: 'system',
          galaxy: this.galaxy,
          region: this.region.toString(),
          system: this.system.toString(),
          body: planetIndex.toString(),
          x: _x,
          y: _y
        });
      });
      planet.on('pointerout', () => this.onHoverLocation!(null));
    }

    return planet;
  }

  public destroy(): void {
    // Remove container from parent
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.removeChildren();
    this.planets.clear();
  }
}

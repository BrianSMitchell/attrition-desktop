import * as PIXI from 'pixi.js';

type TContainer = InstanceType<typeof PIXI.Container>;
import { MapEngine } from '../MapEngine';
import { ViewManager } from './ViewManager';
import { MapLocation } from '../types';
import { NebulaClusterGenerator } from '../effects/NebulaClusterGenerator';

// Import nebula asset
import nebula1Url from '../../../../assets/nebulas/nebula1.png';

/**
 * UniverseView
 * - Renders all galaxies (0..39) in a grid on the current server
 * - Clicking a galaxy notifies onSelectLocation with level: 'galaxy'
 */
export class UniverseView {
  private engine: MapEngine;
  private container: TContainer;
  private onSelectLocation?: (location: MapLocation) => void;
  private onHoverLocation?: (location: MapLocation | null) => void;
  private server: string = 'A';
  
  // Animation and nebula cluster management
  private nebulaClusters: Map<number, TContainer> = new Map();
  private nebulaGroups: Map<number, TContainer> = new Map(); // 0..3 groups (A00-09, A10-19, ...)
  private animationTime: number = 0;
  private isAnimating: boolean = false;

  constructor(
    engine: MapEngine,
    _viewManager: ViewManager,
    onSelectLocation?: (location: MapLocation) => void,
    onHoverLocation?: (location: MapLocation | null) => void
  ) {
    this.engine = engine;
    this.container = new PIXI.Container();
    this.container.name = 'universe-view';
    this.container.visible = false;
    this.onSelectLocation = onSelectLocation;
    this.onHoverLocation = onHoverLocation;
  }

  public setUniverseContext(server: string) {
    this.server = (server || 'A')[0].toUpperCase();
  }

  /**
   * Updates the engine reference to prevent stale reference bugs when React re-mounts UniverseMap
   */
  public updateEngine(newEngine: MapEngine): void {
    console.log('[UniverseView] Updating engine reference to new MapEngine instance');
    this.engine = newEngine;
    
    // Re-initialize the container with the new engine's entities layer if needed
    const currentParent = this.container.parent;
    if (currentParent) {
      console.log('[UniverseView] Removing container from old engine layer');
      currentParent.removeChild(this.container);
    }
    
    // Add to new engine's entities layer
    const newLayer = newEngine.getLayer('entities');
    if (newLayer) {
      console.log('[UniverseView] Adding container to new engine entities layer');
      newLayer.addChild(this.container);
    } else {
      console.warn('[UniverseView] New engine entities layer not found');
    }
  }

  public initialize(): void {
    const layer = this.engine.getLayer('entities');
    if (layer) layer.addChild(this.container);
  }

  public setVisible(visible: boolean): void {
    this.container.visible = visible;
    
    // Manage animations based on visibility
    if (visible && this.nebulaClusters.size > 0) {
      this.startAnimation();
    } else if (!visible) {
      this.stopAnimation();
    }
  }

  public async render(): Promise<void> {
    // Clear container and caches
    this.container.removeChildren();
    this.nebulaClusters.clear();
    this.nebulaGroups.clear();

    // Dimensions
    const vp = this.engine.getViewport();
    const sw = (vp as any)?.screenWidth ?? 1200;
    const sh = (vp as any)?.screenHeight ?? 800;
    const screenWidth = Math.max(800, sw);
    const screenHeight = Math.max(600, sh);

    // Quadrant centers (closer together, more padding from edges)
    const cx = [
      -screenWidth / 4, // top-left (closer to center)
      screenWidth / 4,  // top-right (closer to center)
      -screenWidth / 4, // bottom-left (closer to center)
      screenWidth / 4   // bottom-right (closer to center)
    ];
    const cy = [
      -screenHeight / 4, // top row (closer to center)
      -screenHeight / 4, // top row (closer to center)
      screenHeight / 4,  // bottom row (closer to center)
      screenHeight / 4   // bottom row (closer to center)
    ];

    // Create 4 big nebulas, each holding 10 galaxy labels
    for (let g = 0; g < 4; g++) {
      const groupContainer = this.createNebulaGroupContainer(g, cx[g], cy[g]);
      groupContainer.position.set(cx[g], cy[g]);
      this.container.addChild(groupContainer);
      this.nebulaGroups.set(g, groupContainer);
    }

    // Start animation loop if not already running (slow drift/pulse)
    this.startAnimation();
    console.log('[UniverseView] Rendered grouped nebulas with galaxy labels');
  }

  /*
  // Unused method - commented out to fix TypeScript warning
  private createNebulaClusterEntity(galaxy: number, _x: number, _y: number): TContainer {
    const container = new PIXI.Container();
    container.name = `galaxy_${galaxy}`;
    
    // Generate cluster configuration based on galaxy index
    const clusterConfig = NebulaClusterGenerator.generateClusterConfig(galaxy);
    
    // Create the nebula cluster
    const nebulaCluster = NebulaClusterGenerator.createNebulaCluster(clusterConfig);
    
    // Performance: bake heavy vector layers to a sprite
    try {
      const app = this.engine.getApp();
      NebulaClusterGenerator.bakeCluster(nebulaCluster, app);
    } catch (e) {
      // Baking is optional; ignore failures
    }
    
    // Create label
    const label = new PIXI.Text(`${this.server}${String(galaxy).padStart(2, '0')}`, {
      fontSize: 11,
      fill: 0xffffff,
      align: 'center',
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowAlpha: 0.8,
      dropShadowDistance: 1,
      dropShadowBlur: 2
    } as any);
    label.anchor.set(0.5);
    label.position.set(0, clusterConfig.baseRadius + 16);
    
    // Add components to container
    container.addChild(nebulaCluster);
    container.addChild(label);
    
    // Store cluster reference for hover effects
    (container as any)._nebulaCluster = nebulaCluster;
    (container as any)._galaxyIndex = galaxy;
    
    // Make interactive
    (container as any).eventMode = 'static';
    (container as any).cursor = 'pointer';
    
    // Click handler
    container.on('pointerdown', () => {
      this.onSelectLocation?.({ level: 'galaxy', galaxy });
    });
    
    // Hover handlers with nebula glow effects
    if (this.onHoverLocation) {
      container.on('pointerover', () => {
        NebulaClusterGenerator.setClusterHover(nebulaCluster, true);
        this.onHoverLocation!({ level: 'galaxy', galaxy, x: _x, y: _y });
      });
      
      container.on('pointerout', () => {
        NebulaClusterGenerator.setClusterHover(nebulaCluster, false);
        this.onHoverLocation!(null);
      });
    }
    
    return container;
  }
  */
  
  private createNebulaGroupContainer(groupIndex: number, _centerX: number, _centerY: number): TContainer {
    // groupIndex 0: A00..A09, 1: A10..A19, 2: A20..A29, 3: A30..A39
    const container = new PIXI.Container();
    container.name = `nebula_group_${groupIndex}`;

    let nebulaBackground: TContainer | InstanceType<typeof PIXI.Sprite>;

    // Use PNG asset for group 0 (A00-A09), generated graphics for others
    if (groupIndex === 0) {
      try {
        // Load the nebula PNG asset using imported URL
        const texture = PIXI.Texture.from(nebula1Url);
        const sprite = new PIXI.Sprite(texture);
        
        // Scale and position the sprite to fit our nebula area
        const targetSize = 180 + groupIndex * 5; // same size as generated nebulas
        sprite.anchor.set(0.5); // center the sprite
        sprite.width = targetSize * 2.2; // slightly larger for better coverage
        sprite.height = targetSize * 2.2;
        sprite.alpha = 1.0; // full opacity for vibrant colors
        
        // Enhanced color boosting for more vibrant nebula
        sprite.tint = 0xFFFFFF; // ensure no color tinting initially
        
        // Try multiple approaches to enhance nebula visibility
        // Approach 1: Try numeric blend mode as alternative to string
        try {
          // PIXI.BLEND_MODES.SCREEN is typically 11 in PIXI v7
          (sprite as any).blendMode = 11; // Numeric screen blend mode
        } catch {
          // Fallback: use alpha compositing trick
          sprite.alpha = 1.2; // Slightly over-bright
        }
        
        // Approach 2: Enhanced filters for more dramatic effect
        try {
          const filters = [];
          
          // Dramatically boost contrast and saturation
          const colorMatrix = new (PIXI as any).ColorMatrixFilter();
          if (colorMatrix.contrast && colorMatrix.saturate) {
            colorMatrix.contrast(1.6, false); // Increase contrast by 60%
            colorMatrix.saturate(1.8, false); // Increase saturation by 80%
            colorMatrix.brightness(1.3, false); // Increase brightness by 30%
            filters.push(colorMatrix);
          }
          
          // Add blur filter instead of GlowFilter (not available in PIXI v7.4.3)
          try {
            const blurFilter = new PIXI.BlurFilter(4);
            filters.push(blurFilter);
          } catch {
            // Blur filter not available, continue without it
          }
          
          if (filters.length > 0) {
            sprite.filters = filters;
          }
        } catch (e) {
          console.warn('[UniverseView] Color enhancement filters not available:', e);
        }
        
        // Approach 3: Composite multiple copies for intensity (if other methods fail)
        if (sprite.alpha === 1.0) { // Only if blend mode failed
          try {
            // Create a duplicate sprite with different settings for layering effect
            const enhancementSprite = new PIXI.Sprite(texture);
            enhancementSprite.anchor.set(0.5);
            enhancementSprite.width = targetSize * 2.2;
            enhancementSprite.height = targetSize * 2.2;
            enhancementSprite.alpha = 0.4; // Semi-transparent overlay
            enhancementSprite.tint = 0xAA88FF; // Purple tint for cosmic effect
            
            // Create container with both sprites
            const containerSprite = new PIXI.Container();
            containerSprite.addChild(sprite);
            containerSprite.addChild(enhancementSprite);
            nebulaBackground = containerSprite;
          } catch {
            // If container creation fails, just use the original sprite
            nebulaBackground = sprite;
          }
        } else {
          nebulaBackground = sprite;
        }
        console.log('[UniverseView] Using PNG asset for nebula group 0');
      } catch (error) {
        console.warn('[UniverseView] Failed to load nebula PNG, falling back to generated graphics:', error);
        // Fallback to generated graphics
        nebulaBackground = this.createGeneratedNebula(groupIndex);
      }
    } else {
      // Use generated graphics for other groups
      nebulaBackground = this.createGeneratedNebula(groupIndex);
    }

    container.addChild(nebulaBackground);

    // Place 10 galaxy labels inside an ellipse region around center
    const labels = this.createGalaxyLabelsForGroup(groupIndex, 160, 120);
    labels.forEach(({ galaxy, x, y }) => {
      const label = this.createGalaxyLabel(galaxy);
      label.position.set(x, y);
      container.addChild(label);
    });

    // Track for animation updates (gentle pulse)
    (container as any)._nebulaCluster = nebulaBackground;

    return container;
  }

  private createGeneratedNebula(groupIndex: number): TContainer {
    // Enhanced nebula cluster config for more vibrant appearance
    const cfg = NebulaClusterGenerator.generateClusterConfig(groupIndex, undefined);
    cfg.baseRadius = 180 + groupIndex * 5; // smaller to fit in viewport
    cfg.complexity = 0.75; // increased complexity for richer detail
    cfg.intensity = 1.5; // boosted intensity for more vibrant colors

    const cluster = NebulaClusterGenerator.createNebulaCluster(cfg);
    
    // Apply additional enhancement to generated nebula
    try {
      cluster.alpha = 1.3; // Boost overall alpha for more prominence
      // Try numeric blend mode for generated nebula too
      (cluster as any).blendMode = 11; // Screen blend mode
    } catch {
      // Fallback if blend mode fails
      cluster.alpha = 1.4;
    }
    
    // Bake for perf
    try {
      const app = this.engine.getApp();
      NebulaClusterGenerator.bakeCluster(cluster, app);
    } catch {}

    return cluster;
  }

  private createGalaxyLabelsForGroup(groupIndex: number, rx: number, ry: number): Array<{ galaxy: number; x: number; y: number }> {
    const start = groupIndex * 10; // 0,10,20,30
    const result: Array<{ galaxy: number; x: number; y: number }> = [];

    // Arrange in 2 rows x 5 columns inside ellipse
    const rows = 2;
    const cols = 5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const galaxy = start + idx;
        // Compact positioning to fit within smaller nebulas
        const px = -rx * 0.7 + (c / (cols - 1)) * (rx * 1.4);
        const py = -ry * 0.5 + (r / (rows - 1)) * (ry * 1.0);
        result.push({ galaxy, x: px, y: py });
      }
    }
    console.log(`[UniverseView] Created ${result.length} galaxy labels for group ${groupIndex}:`, result.map(r => `${this.server}${String(r.galaxy).padStart(2, '0')}`));
    return result;
  }

  private createGalaxyLabel(galaxy: number): InstanceType<typeof PIXI.Text> {
    const text = new PIXI.Text(`${this.server}${String(galaxy).padStart(2, '0')}`, {
      fontSize: 14,
      fill: 0xffffff as any,
      align: 'center',
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowAlpha: 1.0, // Stronger shadow for better contrast
      dropShadowDistance: 2, // Larger shadow distance
      dropShadowBlur: 4, // More blur for softer shadow
      stroke: 0x000000, // Add black outline
      strokeThickness: 1, // Thin black outline for better definition
    } as any);
    text.anchor.set(0.5);
    // Interaction: click only (no hover ripple)
    (text as any).eventMode = 'static';
    (text as any).cursor = 'pointer';
    text.on('pointerdown', () => this.onSelectLocation?.({ level: 'galaxy', galaxy }));
    return text;
  }

  /**
   * Start the animation loop for nebula clusters
   */
  private startAnimation(): void {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    console.log('[UniverseView] Starting nebula cluster animations');
    
    const animate = (delta: number = 1) => {
      if (!this.isAnimating) return;
      
      this.animationTime += delta;
      
      // Update all nebula cluster animations
      // Update either per-galaxy or grouped clusters
      if (this.nebulaGroups.size > 0) {
        this.nebulaGroups.forEach((grp) => {
          const nebulaCluster = (grp as any)._nebulaCluster;
          if (nebulaCluster) {
            NebulaClusterGenerator.updateClusterAnimation(nebulaCluster, delta, this.animationTime);
          }
        });
      } else {
        this.nebulaClusters.forEach((container) => {
          const nebulaCluster = (container as any)._nebulaCluster;
          if (nebulaCluster) {
            NebulaClusterGenerator.updateClusterAnimation(nebulaCluster, delta, this.animationTime);
          }
        });
      }
      
      // Continue animation loop
      requestAnimationFrame(() => animate(1));
    };
    
    animate();
  }
  
  /**
   * Stop the animation loop
   */
  private stopAnimation(): void {
    this.isAnimating = false;
    console.log('[UniverseView] Stopped nebula cluster animations');
  }
  
  /**
   * Update the color scheme of a specific galaxy cluster
   */
  public updateGalaxyColorScheme(galaxyIndex: number, colorScheme: string): void {
    const container = this.nebulaClusters.get(galaxyIndex);
    if (container) {
      const nebulaCluster = (container as any)._nebulaCluster;
      if (nebulaCluster) {
        NebulaClusterGenerator.updateClusterColorScheme(nebulaCluster, colorScheme);
      }
    }
  }
  
  /**
   * Update multiple galaxies with their respective color schemes
   */
  public updateGalaxyStates(galaxyStates: Map<number, { colorScheme: string }>): void {
    galaxyStates.forEach((state, galaxyIndex) => {
      this.updateGalaxyColorScheme(galaxyIndex, state.colorScheme);
    });
  }

  public destroy(): void {
    // Stop animations
    this.stopAnimation();
    
    // Clear nebula clusters
    this.nebulaClusters.clear();
    
    // Clean up container
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.removeChildren();
    
    // Satisfy TypeScript - onHoverLocation is kept for potential future use
    void this.onHoverLocation;
  }
}

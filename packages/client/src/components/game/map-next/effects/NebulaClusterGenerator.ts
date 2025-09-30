import * as PIXI from 'pixi.js';

type TContainer = InstanceType<typeof PIXI.Container>;
type TGraphics = InstanceType<typeof PIXI.Graphics>;

export interface ClusterConfig {
  baseRadius: number;
  complexity: number;
  colorScheme: 'default' | 'owned' | 'allied' | 'contested' | 'hostile';
  intensity: number;
  animationSpeed?: number;
}

export interface ClusterColors {
  primary: number;
  secondary: number;
  accent: number;
  glow: number;
}

/**
 * Creates organic nebula cluster representations for galaxy regions
 */

export class NebulaClusterGenerator {
  private static readonly COLOR_SCHEMES: Record<string, ClusterColors> = {
    default: {
      primary: 0x40b4ff,    // Brighter default blue
      secondary: 0x2196f3,
      accent: 0x82c7ff,
      glow: 0xb8e6ff
    },
    owned: {
      primary: 0x66bb6a,    // Brighter green for owned
      secondary: 0x4caf50,
      accent: 0x81c784,
      glow: 0xa5d6a7
    },
    allied: {
      primary: 0xab47bc,    // Brighter purple for allied
      secondary: 0x9c27b0,
      accent: 0xce93d8,
      glow: 0xe1bee7
    },
    contested: {
      primary: 0xffa726,    // Brighter orange for contested
      secondary: 0xff9800,
      accent: 0xffcc80,
      glow: 0xffe0b2
    },
    hostile: {
      primary: 0xff5252,    // Brighter red for hostile
      secondary: 0xf44336,
      accent: 0xff8a80,
      glow: 0xffab91
    }
  };

  /**
   * Create an organic nebula cluster container
   */
  public static createNebulaCluster(config: ClusterConfig): TContainer {
    const cluster = new PIXI.Container();
    const colors = this.COLOR_SCHEMES[config.colorScheme] || this.COLOR_SCHEMES.default;
    
    // Create multiple layers for depth and organic feel
    const baseLayer = this.createBaseNebulaLayer(config, colors);
    const detailLayer = this.createDetailLayer(config, colors);
    const coreLayer = this.createCoreLayer(config, colors);
    const glowLayer = this.createGlowLayer(config, colors);
    
    // Group first three layers for optional baking
    const bakeGroup = new PIXI.Container();
    bakeGroup.addChild(baseLayer);
    bakeGroup.addChild(detailLayer);
    bakeGroup.addChild(coreLayer);
    
    // Add layers in order (back to front)
    cluster.addChild(bakeGroup);
    cluster.addChild(glowLayer);
    
    // Keep refs
    (cluster as any)._bakeGroup = bakeGroup;
    
    // Store animation properties for updates
    (cluster as any)._pulseSpeed = (config.animationSpeed || 1.0) * (0.0005 + Math.random() * 0.0003);
    (cluster as any)._rotationSpeed = (config.animationSpeed || 1.0) * (Math.random() - 0.5) * 0.0001;
    (cluster as any)._baseIntensity = config.intensity;
    (cluster as any)._colorScheme = config.colorScheme;
    
    // Apply a subtle blur for contested/hostile regions (shader removed for Pixi v7 compat)
    if (config.colorScheme === 'contested' || config.colorScheme === 'hostile') {
      try {
        const subtle = new (PIXI as any).BlurFilter(2);
        (cluster as any)._contestedFilter = {
          tick: (_dt: number) => {},
          setIntensity: (_v: number) => {},
          setTint: (_t: number) => {},
        };
        cluster.filters = [...(cluster.filters || []), subtle];
      } catch {
        // ignore if filters not available
      }
    }
    
    return cluster;
  }
  
  /**
   * Create the base nebula shape (largest, most diffuse)
   */
  private static createBaseNebulaLayer(config: ClusterConfig, colors: ClusterColors): TContainer {
    const layer = new PIXI.Container();
    
    // Create 2-3 overlapping base shapes for organic look
    const shapeCount = Math.floor(config.complexity * 2) + 2;
    
    for (let i = 0; i < shapeCount; i++) {
      const shape = new PIXI.Graphics();
      
      // Organic elliptical shapes with random variations
      const radiusX = config.baseRadius * (0.8 + Math.random() * 0.4);
      const radiusY = config.baseRadius * (0.6 + Math.random() * 0.3);
      const offsetX = (Math.random() - 0.5) * config.baseRadius * 0.3;
      const offsetY = (Math.random() - 0.5) * config.baseRadius * 0.3;
      const rotation = Math.random() * Math.PI * 2;
      
      // Use secondary color with enhanced alpha for more vibrant base
      const alpha = (0.15 + Math.random() * 0.10) * config.intensity;
      shape.beginFill(colors.secondary, alpha);
      shape.drawEllipse(offsetX, offsetY, radiusX, radiusY);
      shape.endFill();
      
      shape.rotation = rotation;
      
      // Apply blur for nebula effect
      try {
        shape.filters = [new PIXI.BlurFilter(25 + Math.random() * 15) as any];
      } catch (e) {
        // Fallback if filters unavailable
      }
      
      layer.addChild(shape);
    }
    
    return layer;
  }
  
  /**
   * Create detail layer with more defined structures
   */
  private static createDetailLayer(config: ClusterConfig, colors: ClusterColors): TContainer {
    const layer = new PIXI.Container();
    
    // Create detail structures - wisps and tendrils
    const detailCount = Math.floor(config.complexity * 3) + 2;
    
    for (let i = 0; i < detailCount; i++) {
      const detail = new PIXI.Graphics();
      
      // Create flowing tendril shapes
      const length = config.baseRadius * (0.4 + Math.random() * 0.6);
      const width = config.baseRadius * (0.15 + Math.random() * 0.2);
      const angle = (Math.PI * 2 * i) / detailCount + Math.random() * 0.5;
      
      const startX = Math.cos(angle) * config.baseRadius * 0.2;
      const startY = Math.sin(angle) * config.baseRadius * 0.2;
      const endX = Math.cos(angle) * length;
      const endY = Math.sin(angle) * length;
      
      const alpha = (0.18 + Math.random() * 0.12) * config.intensity;
      detail.beginFill(colors.primary, alpha);
      
      // Draw organic tendril shape
      detail.moveTo(startX, startY);
      const controlX = (startX + endX) / 2 + (Math.random() - 0.5) * width;
      const controlY = (startY + endY) / 2 + (Math.random() - 0.5) * width;
      detail.quadraticCurveTo(controlX, controlY, endX, endY);
      detail.lineTo(endX + width, endY);
      detail.quadraticCurveTo(controlX + width, controlY, startX + width, startY);
      detail.endFill();
      
      // Apply moderate blur
      try {
        detail.filters = [new PIXI.BlurFilter(12 + Math.random() * 8) as any];
      } catch (e) {
        // Fallback if filters unavailable
      }
      
      layer.addChild(detail);
    }
    
    return layer;
  }
  
  /**
   * Create the bright core of the nebula cluster
   */
  private static createCoreLayer(config: ClusterConfig, colors: ClusterColors): TContainer {
    const layer = new PIXI.Container();
    
    // Main core
    const core = new PIXI.Graphics();
    const coreRadius = config.baseRadius * 0.3;
    const alpha = (0.25 + Math.random() * 0.15) * config.intensity;
    
    core.beginFill(colors.accent, alpha);
    core.drawCircle(0, 0, coreRadius);
    core.endFill();
    
    // Apply light blur for soft edges
    try {
      core.filters = [new PIXI.BlurFilter(6 + Math.random() * 4) as any];
    } catch (e) {
      // Fallback if filters unavailable
    }
    
    layer.addChild(core);
    
    // Add 2-3 smaller bright spots
    const spotCount = Math.floor(config.complexity * 1.5) + 1;
    for (let i = 0; i < spotCount; i++) {
      const spot = new PIXI.Graphics();
      const spotRadius = coreRadius * (0.3 + Math.random() * 0.4);
      const spotAlpha = alpha * (0.6 + Math.random() * 0.4);
      
      const offsetAngle = (Math.PI * 2 * i) / spotCount;
      const offsetDistance = coreRadius * (0.5 + Math.random() * 0.3);
      const spotX = Math.cos(offsetAngle) * offsetDistance;
      const spotY = Math.sin(offsetAngle) * offsetDistance;
      
      spot.beginFill(colors.primary, spotAlpha);
      spot.drawCircle(spotX, spotY, spotRadius);
      spot.endFill();
      
      try {
        spot.filters = [new PIXI.BlurFilter(4 + Math.random() * 3) as any];
      } catch (e) {
        // Fallback if filters unavailable
      }
      
      layer.addChild(spot);
    }
    
    return layer;
  }
  
  /**
   * Create outer glow effect for hover states
   */
  private static createGlowLayer(config: ClusterConfig, colors: ClusterColors): TContainer {
    const layer = new PIXI.Container();
    
    // Outer glow ring
    const glow = new PIXI.Graphics();
    const glowRadius = config.baseRadius * 1.2;
    const alpha = (0.12 + Math.random() * 0.08) * config.intensity;
    
    glow.beginFill(colors.glow, alpha);
    glow.drawCircle(0, 0, glowRadius);
    glow.endFill();
    
    // Apply heavy blur for glow effect
    try {
      glow.filters = [new PIXI.BlurFilter(40 + Math.random() * 20) as any];
    } catch (e) {
      // Fallback if filters unavailable
    }
    
    // Initially hidden - shown on hover
    glow.visible = false;
    (layer as any)._glowElement = glow;
    
    layer.addChild(glow);
    return layer;
  }
  
  /**
   * Update animations for a nebula cluster
   */
  public static updateClusterAnimation(cluster: TContainer, delta: number, time: number): void {
    const pulseSpeed = (cluster as any)._pulseSpeed || 0.001;
    const rotationSpeed = (cluster as any)._rotationSpeed || 0;
    const baseIntensity = (cluster as any)._baseIntensity || 1;
    
    // Gentle rotation
    cluster.rotation += rotationSpeed * delta;
    
    // Subtle pulsing effect on alpha
    const pulse = Math.sin(time * pulseSpeed) * 0.1;
    cluster.alpha = Math.max(0.7, baseIntensity + pulse);
    
    // Animate individual layers differently
    const bakeGroup = (cluster as any)._bakeGroup as TContainer | undefined;
    if (bakeGroup && bakeGroup.children.length >= 2) {
      const detailLayer = bakeGroup.children[1]; // Detail layer inside bake group
      const coreLayer = bakeGroup.children[2] || bakeGroup.children[bakeGroup.children.length - 1];   // Core layer
      
      // Detail layer gets slower counter-rotation
      detailLayer.rotation += rotationSpeed * -0.5 * delta;
      
      // Core layer gets subtle scale pulsing
      const coreScale = 1.0 + Math.sin(time * pulseSpeed * 1.3) * 0.05;
      coreLayer.scale.set(coreScale);
    }

    // Tick contested filter if present
    const f = (cluster as any)._contestedFilter as { tick?: (dt:number)=>void } | undefined;
    if (f && typeof f.tick === 'function') {
      f.tick(delta);
    }
  }
  
  /**
   * Show/hide hover glow effect
   */
  public static setClusterHover(cluster: TContainer, isHovered: boolean): void {
    // Find glow layer (should be last child)
    const glowLayer = cluster.children[cluster.children.length - 1];
    if (glowLayer && (glowLayer as any)._glowElement) {
      const glow = (glowLayer as any)._glowElement;
      glow.visible = isHovered;
      
      if (isHovered) {
        // Add enhanced ripple ring
        let ripple = (cluster as any)._hoverRipple as TGraphics | undefined;
        if (!ripple) {
          ripple = new PIXI.Graphics();
          ripple.lineStyle(2, 0xffffff, 0.6);
          ripple.drawCircle(0, 0, 1);
          ripple.endFill();
          ripple.alpha = 0.9;
          (cluster as any)._hoverRipple = ripple;
          cluster.addChild(ripple);
        }
        ripple.visible = true;
        ripple.scale.set(0.2);
        ripple.alpha = 0.9;

        const start = performance.now();
        const duration = 350; // ms
        const animateRipple = () => {
          const t = Math.min((performance.now() - start) / duration, 1);
          const ease = t < 0.5 ? 2*t : -1 + (4 - 2 * t) * t; // easeInOutQuad
          ripple!.scale.set(0.2 + ease * 1.0);
          ripple!.alpha = 0.9 * (1 - t);
          if (t < 1 && ripple!.visible) {
            requestAnimationFrame(animateRipple);
          } else {
            ripple!.visible = false;
          }
        };
        requestAnimationFrame(animateRipple);

        // Scale-in glow as well
        glow.scale.set(0.85);
        const animateGlow = () => {
          glow.scale.x += (1.0 - glow.scale.x) * 0.15;
          glow.scale.y += (1.0 - glow.scale.y) * 0.15;
          if (glow.visible && Math.abs(glow.scale.x - 1.0) > 0.01) {
            requestAnimationFrame(animateGlow);
          }
        };
        animateGlow();
      }
    }
  }
  
  /**
   * Change cluster color scheme dynamically
   */
  public static updateClusterColorScheme(cluster: TContainer, newScheme: string): void {
    const colors = this.COLOR_SCHEMES[newScheme] || this.COLOR_SCHEMES.default;
    
    // This is a simplified update - in a full implementation, you'd need to 
    // regenerate the graphics with new colors or use tint properties
    cluster.tint = colors.primary;
    (cluster as any)._colorScheme = newScheme;

    // Update or remove contested filter
    if (newScheme === 'contested' || newScheme === 'hostile') {
      let stub = (cluster as any)._contestedFilter as { setIntensity?: (v:number)=>void; setTint?: (t:number)=>void } | undefined;
      if (!stub) {
        try {
          const subtle = new (PIXI as any).BlurFilter(2);
          (cluster as any)._contestedFilter = {
            setIntensity: (_v: number) => {},
            setTint: (_t: number) => {},
          };
          cluster.filters = [...(cluster.filters || []), subtle];
        } catch {
          // ignore
        }
      } else {
        stub.setIntensity?.(newScheme === 'hostile' ? 0.8 : 0.6);
        stub.setTint?.(colors.primary);
      }
    } else if ((cluster as any)._contestedFilter) {
      // Remove any blur filter previously applied
      cluster.filters = (cluster.filters || []).filter((x: any) => !(x instanceof (PIXI as any).BlurFilter));
      (cluster as any)._contestedFilter = undefined;
    }
  }
  
  /**
   * Generate a cluster configuration based on region properties
   */
  public static generateClusterConfig(regionIndex: number, regionData?: any): ClusterConfig {
    // Base configuration with some procedural variation
    const baseRadius = 18 + Math.sin(regionIndex * 0.7) * 6; // 12-24 radius
    const complexity = 0.3 + Math.cos(regionIndex * 1.1) * 0.3; // 0.0-0.6 complexity
    
    // Determine color scheme based on region data
    let colorScheme: ClusterConfig['colorScheme'] = 'default';
    if (regionData) {
      if (regionData.isOwned) colorScheme = 'owned';
      else if (regionData.isAllied) colorScheme = 'allied';
      else if (regionData.isContested) colorScheme = 'contested';
      else if (regionData.isHostile) colorScheme = 'hostile';
    }
    
    return {
      baseRadius,
      complexity: Math.max(0.1, Math.min(1.0, complexity)),
      colorScheme,
      intensity: 0.8 + Math.random() * 0.4,
      animationSpeed: 0.8 + Math.random() * 0.4
    };
  }

  /**
   * Bake heavy vector layers (base/detail/core) into a single sprite
   * to reduce draw calls. Keeps glow layer and interactivity intact.
   */
  public static bakeCluster(cluster: TContainer, app: InstanceType<typeof PIXI.Application>): void {
    const bakeGroup = (cluster as any)._bakeGroup as TContainer | undefined;
    if (!bakeGroup || bakeGroup.children.length === 0) return;

    // Render to texture with padding to preserve blur/soft edges
    const raw = bakeGroup.getLocalBounds();
    const pad = 48; // generous padding for filters
    const region = { x: raw.x - pad, y: raw.y - pad, width: raw.width + pad * 2, height: raw.height + pad * 2 } as any;
    const rt = app.renderer.generateTexture(bakeGroup as any, { region });

    // Create sprite and center it where the bake group was
    const sprite = new PIXI.Sprite(rt);
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(bakeGroup.x + region.x + region.width/2, bakeGroup.y + region.y + region.height/2);

    // Replace bake group with sprite
    const parent = bakeGroup.parent;
    if (!parent) return;
    const idx = parent.getChildIndex(bakeGroup);
    parent.removeChild(bakeGroup);
    parent.addChildAt(sprite, idx);

    (cluster as any)._baked = true;
  }
}

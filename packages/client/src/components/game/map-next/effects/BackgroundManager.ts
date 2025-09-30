import * as PIXI from 'pixi.js'

type TContainer = InstanceType<typeof PIXI.Container>;
type TSprite = InstanceType<typeof PIXI.Sprite>;
type TGraphics = InstanceType<typeof PIXI.Graphics>;
type TTexture = InstanceType<typeof PIXI.Texture>;

export interface StarfieldOptions {
  width: number;
  height: number;
  starCount?: number;
  nebulaCount?: number;
  backgroundImagePath?: string;
  enableParallax?: boolean;
  enableAdvancedEffects?: boolean;
}

export class BackgroundManager {
  private container: TContainer;
  private backgroundSprite?: TSprite;
  private stars: TGraphics[] = [];
  private nebulae: TContainer[] = [];
  private time: number = 0;
  private isLoading: boolean = false;
  
  // Enhanced parallax layers
  private parallaxLayers: Map<string, TContainer> = new Map();
  private deepSpaceLayer: TContainer;
  private midSpaceLayer: TContainer;
  private foregroundLayer: TContainer;
  private nebulaEffectsLayer: TContainer;
  
  // Advanced visual elements
  private distantGalaxies: TSprite[] = [];
  private nebulaEffects: TContainer[] = [];
  private cosmicDust: TGraphics[] = [];

constructor(private options: StarfieldOptions) {
    this.container = new PIXI.Container();
    
    // Set up parallax layer structure
    this.deepSpaceLayer = new PIXI.Container();
    this.midSpaceLayer = new PIXI.Container();
    this.foregroundLayer = new PIXI.Container();
    this.nebulaEffectsLayer = new PIXI.Container();
    
    // Set z-index for proper layering (back to front)
    this.deepSpaceLayer.zIndex = 0;
    this.midSpaceLayer.zIndex = 10;
    this.nebulaEffectsLayer.zIndex = 20;
    this.foregroundLayer.zIndex = 30;
    
    // Store in easy-to-access map and add to main container
    this.parallaxLayers.set('deep', this.deepSpaceLayer);
    this.parallaxLayers.set('mid', this.midSpaceLayer);
    this.parallaxLayers.set('nebula', this.nebulaEffectsLayer);
    this.parallaxLayers.set('fore', this.foregroundLayer);
    
    // Enable sorting by zIndex
    this.container.sortableChildren = true;
    
    // Add all layers to the container
    this.container.addChild(this.deepSpaceLayer);
    this.container.addChild(this.midSpaceLayer);
    this.container.addChild(this.nebulaEffectsLayer);
    this.container.addChild(this.foregroundLayer);
    
    console.log('[BackgroundManager] Initialized with parallax layer structure');
    
    // Initialize async - calling code should await getInitializationPromise() if needed
    this.initialize().catch(error => {
      console.error('[BackgroundManager] Failed to initialize:', error);
    });
  }
  
  public async getInitializationPromise(): Promise<void> {
    // Wait for any ongoing initialization
    while (this.isLoading) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private async initialize() {
    // Decide which single base background to create
    console.log('[BackgroundManager] Initializing background');

    const hasImagePath = !!this.options.backgroundImagePath;

    if (hasImagePath) {
      // Try to load image; on failure fall back to gradient
      try {
        await this.loadBackgroundImage();
      } catch (e) {
        console.warn('[BackgroundManager] Image load threw (will fall back to gradient):', e);
        this.createGradientBackground();
      }
    } else {
      // No image path provided — use gradient fallback
      this.createGradientBackground();
    }
    
    // Create distant galaxies and deep space elements
    this.createDeepSpaceElements();
    
    // Create enhanced multi-layer starfield
    this.createMultiLayerStarfield();
    
    // Create advanced nebula effects (if enabled)
    if (this.options.enableAdvancedEffects !== false) {
      this.createAdvancedNebulaEffects();
    }
    
    // Create cosmic dust and particles
    this.createCosmicDustEffects();
    
    console.log('[BackgroundManager] Multi-layer cosmic background initialized');
    console.log('[BackgroundManager] Layer structure:', {
      deepSpace: this.deepSpaceLayer.children.length,
      midSpace: this.midSpaceLayer.children.length, 
      nebula: this.nebulaEffectsLayer.children.length,
      foreground: this.foregroundLayer.children.length,
      total: this.container.children.length
    });
  }
  
  private async loadBackgroundImage(): Promise<void> {
    if (this.isLoading || !this.options.backgroundImagePath) {
      console.log('[BackgroundManager] Skipping background load:', { isLoading: this.isLoading, hasPath: !!this.options.backgroundImagePath });
      return;
    }
    
    this.isLoading = true;
    console.log('[BackgroundManager] ===== LOADING BACKGROUND IMAGE =====');
    console.log('[BackgroundManager] Image path:', this.options.backgroundImagePath);
    console.log('[BackgroundManager] Container size:', { width: this.options.width, height: this.options.height });
    
    try {
      console.log('[BackgroundManager] Attempting to load texture...');
      // Load the texture
      const texture: TTexture = await PIXI.Assets.load(this.options.backgroundImagePath);
      
      console.log('[BackgroundManager] Texture loaded successfully:', {
        width: texture.width,
        height: texture.height,
        valid: texture.valid
      });
      
      // Create background sprite
      this.backgroundSprite = new PIXI.Sprite(texture);
      
      // Scale to cover the entire area while maintaining aspect ratio
      const scaleX = this.options.width / texture.width;
      const scaleY = this.options.height / texture.height;
      const scale = Math.max(scaleX, scaleY);
      
      console.log('[BackgroundManager] Scaling sprite:', { scaleX, scaleY, finalScale: scale });
      
      this.backgroundSprite.scale.set(scale);
      
      // Center the background at world origin. Our viewport's world origin (0,0)
      // is the visual center of the screen, so with anchor 0.5 we should position at (0,0).
      this.backgroundSprite.anchor.set(0.5);
      this.backgroundSprite.position.set(0, 0);
      
      // Add subtle tint for depth
      this.backgroundSprite.tint = 0xE8E8FF; // Very subtle blue tint
      
      // Add to deep space layer (furthest background)
      this.deepSpaceLayer.addChild(this.backgroundSprite);
      
      console.log('[BackgroundManager] Background sprite added to container at index 0');
      console.log('[BackgroundManager] Background image loaded successfully!');
      console.log('[BackgroundManager] ===== BACKGROUND LOAD COMPLETE =====');
    } catch (error) {
      console.error('[BackgroundManager] ===== BACKGROUND LOAD FAILED =====');
      console.error('[BackgroundManager] Error details:', error);
      console.log('[BackgroundManager] Falling back to gradient background');
      
      // Fallback to gradient background
      this.createGradientBackground();
    } finally {
      this.isLoading = false;
    }
  }
  
  private createGradientBackground(): void {
    console.log('[BackgroundManager] Creating fallback cosmic gradient background');
    
    // Create cosmic nebula-like gradient background
    const background = new PIXI.Graphics();
    
    // Position background centered at world origin with anchor
    background.pivot.set(this.options.width / 2, this.options.height / 2);
    background.position.set(0, 0);
    
    // Draw multiple overlapping gradients for nebula effect
    const centerX = this.options.width / 2;
    const centerY = this.options.height / 2;
    
    // Base dark space
    background.beginFill(0x000011);
    background.drawRect(0, 0, this.options.width, this.options.height);
    background.endFill();
    
    // Create multiple nebula clouds
    const nebulaColors = [0x4A0E4E, 0x2E1065, 0x1A237E, 0x0D47A1, 0x006064];
    
    for (let i = 0; i < 8; i++) {
      const nebula = new PIXI.Graphics();
      const color = nebulaColors[i % nebulaColors.length];
      
      // Random position and size for each nebula cloud
      const x = (Math.random() - 0.5) * this.options.width + centerX;
      const y = (Math.random() - 0.5) * this.options.height + centerY;
      const radius = Math.random() * 200 + 100;
      
      nebula.beginFill(color, 0.15 + Math.random() * 0.1);
      nebula.drawCircle(x, y, radius);
      nebula.endFill();
      
      // Add blur filter for nebula effect
      try {
      nebula.filters = [new PIXI.BlurFilter(40 + Math.random() * 30) as any];
      } catch (e) {
        console.warn('[BackgroundManager] Blur filter not available, skipping');
      }
      
      background.addChild(nebula);
    }
    
    this.deepSpaceLayer.addChild(background);
    console.log('[BackgroundManager] Fallback cosmic background created successfully');
  }
  
  /**
   * Create distant galaxies and deep space background elements
   */
  private createDeepSpaceElements(): void {
    console.log('[BackgroundManager] Creating deep space elements');
    
    // Create distant galaxies (tiny spiral shapes far in background)
    const galaxyCount = 8;
    
    for (let i = 0; i < galaxyCount; i++) {
      const galaxy = new PIXI.Container();
      
      // Create a simple distant galaxy shape
      const core = new PIXI.Graphics();
      const arms = new PIXI.Graphics();
      
      // Galaxy core
      core.beginFill(0xFFEEBB, 0.6);
      core.drawCircle(0, 0, 2 + Math.random() * 2);
      core.endFill();
      
      // Galaxy spiral arms (simplified)
      arms.beginFill(0xDDCCEE, 0.3);
      arms.drawEllipse(0, 0, 8 + Math.random() * 6, 3 + Math.random() * 2);
      arms.endFill();
      
      // Rotate for variety
      arms.rotation = Math.random() * Math.PI * 2;
      
      galaxy.addChild(arms);
      galaxy.addChild(core);
      
      // Position randomly across the view
      galaxy.position.set(
        (Math.random() - 0.5) * this.options.width * 1.5,
        (Math.random() - 0.5) * this.options.height * 1.5
      );
      
      // Add subtle rotation animation data
      (galaxy as any)._rotationSpeed = (Math.random() - 0.5) * 0.0001;
      
      this.distantGalaxies.push(galaxy as any);
      this.deepSpaceLayer.addChild(galaxy);
    }
  }
  
  /**
   * Create multi-layered starfield with parallax depth
   */
  private createMultiLayerStarfield(): void {
    console.log('[BackgroundManager] Creating multi-layer starfield');
    
    const starCount = this.options.starCount || 200;
    
    // Distribute stars across different layers for parallax effect
    const deepStars = Math.floor(starCount * 0.3);
    const midStars = Math.floor(starCount * 0.4);
    const foreStars = starCount - deepStars - midStars;
    
    // Deep space stars (smallest, dimmest)
    this.createStarLayer(deepStars, this.deepSpaceLayer, {
      sizeRange: [0.2, 0.8],
      alphaRange: [0.2, 0.5],
      twinkleSpeed: 0.0003,
      parallaxMultiplier: 0.2
    });
    
    // Mid space stars (medium)
    this.createStarLayer(midStars, this.midSpaceLayer, {
      sizeRange: [0.5, 1.2], 
      alphaRange: [0.4, 0.7],
      twinkleSpeed: 0.0005,
      parallaxMultiplier: 0.5
    });
    
    // Foreground stars (largest, brightest)
    this.createStarLayer(foreStars, this.foregroundLayer, {
      sizeRange: [0.8, 1.8],
      alphaRange: [0.6, 0.9],
      twinkleSpeed: 0.0008,
      parallaxMultiplier: 1.0
    });
  }
  
  /**
   * Create stars for a specific layer with given properties
   */
  private createStarLayer(count: number, layer: TContainer, config: {
    sizeRange: [number, number];
    alphaRange: [number, number];
    twinkleSpeed: number;
    parallaxMultiplier: number;
  }): void {
    for (let i = 0; i < count; i++) {
      const star = new PIXI.Graphics();
      
      // Star type and characteristics
      const starType = Math.random();
      const baseSize = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
      const brightness = config.alphaRange[0] + Math.random() * (config.alphaRange[1] - config.alphaRange[0]);
      
      // Different star types
      if (starType < 0.7) {
        // Regular white stars
        star.beginFill(0xFFFFFF, brightness);
        star.drawCircle(0, 0, baseSize);
      } else if (starType < 0.85) {
        // Blue giants
        star.beginFill(0x8888FF, brightness * 0.9);
        star.drawCircle(0, 0, baseSize * 1.2);
      } else if (starType < 0.95) {
        // Red dwarfs
        star.beginFill(0xFF8888, brightness * 0.8);
        star.drawCircle(0, 0, baseSize * 0.7);
      } else {
        // Golden/yellow stars
        star.beginFill(0xFFDD88, brightness);
        star.drawCircle(0, 0, baseSize * 1.1);
      }
      
      star.endFill();
      
      // Random position
      star.position.set(
        (Math.random() - 0.5) * this.options.width,
        (Math.random() - 0.5) * this.options.height
      );
      
      // Store animation properties
      (star as any)._twinkleSpeed = config.twinkleSpeed + Math.random() * config.twinkleSpeed;
      (star as any)._twinklePhase = Math.random() * Math.PI * 2;
      (star as any)._baseBrightness = brightness;
      (star as any)._parallaxMultiplier = config.parallaxMultiplier;
      
      this.stars.push(star);
      layer.addChild(star);
    }
  }
  
  /**
   * Create advanced nebula effects with dynamic colors and shapes
   */
  private createAdvancedNebulaEffects(): void {
    console.log('[BackgroundManager] Creating advanced nebula effects');
    
    const nebulaCount = this.options.nebulaCount || 4;
    
    for (let i = 0; i < nebulaCount; i++) {
      const nebula = new PIXI.Container();
      
      // Create multiple layers for each nebula cloud
      const baseLayer = new PIXI.Graphics();
      const detailLayer = new PIXI.Graphics();
      const glowLayer = new PIXI.Graphics();
      
      // Nebula colors (cosmic theme)
      const nebulaColors = [
        { base: 0x4A0E4E, detail: 0x8A4E8A, glow: 0xBA8EBA },  // Purple
        { base: 0x2E1065, detail: 0x5E4095, glow: 0x8E70C5 },  // Deep Blue
        { base: 0x1A237E, detail: 0x4A53AE, glow: 0x7A83DE },  // Blue
        { base: 0x0D47A1, detail: 0x3D77D1, glow: 0x6DA7FF },  // Light Blue
        { base: 0x006064, detail: 0x309094, glow: 0x60C0C4 },  // Teal
      ];
      
      const colorSet = nebulaColors[i % nebulaColors.length];
      const centerX = (Math.random() - 0.5) * this.options.width * 0.8;
      const centerY = (Math.random() - 0.5) * this.options.height * 0.8;
      const baseRadius = 80 + Math.random() * 120;
      
      // Base nebula shape (largest, most transparent)
      baseLayer.beginFill(colorSet.base, 0.08 + Math.random() * 0.05);
      baseLayer.drawEllipse(centerX, centerY, baseRadius * 1.2, baseRadius * 0.7);
      baseLayer.endFill();
      
      // Detail layer (medium)
      detailLayer.beginFill(colorSet.detail, 0.12 + Math.random() * 0.06);
      detailLayer.drawEllipse(
        centerX + (Math.random() - 0.5) * 20, 
        centerY + (Math.random() - 0.5) * 20, 
        baseRadius * 0.8, 
        baseRadius * 0.5
      );
      detailLayer.endFill();
      
      // Glow core (smallest, brightest)
      glowLayer.beginFill(colorSet.glow, 0.2 + Math.random() * 0.1);
      glowLayer.drawEllipse(
        centerX + (Math.random() - 0.5) * 10, 
        centerY + (Math.random() - 0.5) * 10, 
        baseRadius * 0.4, 
        baseRadius * 0.25
      );
      glowLayer.endFill();
      
      // Apply blur filters for nebula effect
      try {
        baseLayer.filters = [new PIXI.BlurFilter(60 + Math.random() * 40) as any];
        detailLayer.filters = [new PIXI.BlurFilter(30 + Math.random() * 20) as any];
        glowLayer.filters = [new PIXI.BlurFilter(15 + Math.random() * 10) as any];
      } catch (e) {
        console.warn('[BackgroundManager] Blur filters not available for nebula effects');
      }
      
      // Compose nebula
      nebula.addChild(baseLayer);
      nebula.addChild(detailLayer);
      nebula.addChild(glowLayer);
      
      // Random rotation
      nebula.rotation = Math.random() * Math.PI * 2;
      
      // Store animation properties
      (nebula as any)._driftSpeed = (Math.random() - 0.5) * 0.0002;
      (nebula as any)._rotationSpeed = (Math.random() - 0.5) * 0.0001;
      (nebula as any)._pulseSpeed = 0.0001 + Math.random() * 0.0002;
      (nebula as any)._baseAlpha = nebula.alpha;
      
      this.nebulaEffects.push(nebula);
      this.nebulaEffectsLayer.addChild(nebula);
    }
  }
  
  /**
   * Create cosmic dust and particle effects
   */
  private createCosmicDustEffects(): void {
    console.log('[BackgroundManager] Creating cosmic dust effects');
    
    // Create floating cosmic dust particles
    const dustParticleCount = 30;
    
    for (let i = 0; i < dustParticleCount; i++) {
      const dust = new PIXI.Graphics();
      
      // Tiny dust particles with varying colors
      const dustColors = [0xFFEECC, 0xCCDDFF, 0xFFCCDD, 0xCCFFDD];
      const color = dustColors[Math.floor(Math.random() * dustColors.length)];
      const size = Math.random() * 0.6 + 0.2;
      const alpha = Math.random() * 0.15 + 0.05;
      
      dust.beginFill(color, alpha);
      dust.drawCircle(0, 0, size);
      dust.endFill();
      
      // Position randomly
      dust.position.set(
        (Math.random() - 0.5) * this.options.width,
        (Math.random() - 0.5) * this.options.height
      );
      
      // Store movement properties
      (dust as any)._driftX = (Math.random() - 0.5) * 0.0003;
      (dust as any)._driftY = (Math.random() - 0.5) * 0.0002;
      (dust as any)._pulseSpeed = Math.random() * 0.0008;
      (dust as any)._pulsePhase = Math.random() * Math.PI * 2;
      (dust as any)._baseAlpha = alpha;
      
      this.cosmicDust.push(dust);
      this.midSpaceLayer.addChild(dust);
    }
    
    // Create flowing energy streams in nebula layer
    const streamCount = 3;
    for (let i = 0; i < streamCount; i++) {
      const stream = new PIXI.Container();
      
      // Create a flowing line of particles
      const particleCount = 12;
      for (let j = 0; j < particleCount; j++) {
        const particle = new PIXI.Graphics();
        
        particle.beginFill(0x88CCFF, 0.2);
        particle.drawCircle(0, 0, 0.8 + Math.random() * 0.4);
        particle.endFill();
        
        // Arrange in a flowing line
        const angle = Math.random() * Math.PI * 2;
        const distance = j * 15 + Math.random() * 10;
        particle.position.set(
          Math.cos(angle) * distance,
          Math.sin(angle) * distance
        );
        
        stream.addChild(particle);
      }
      
      // Position the stream
      stream.position.set(
        (Math.random() - 0.5) * this.options.width * 0.8,
        (Math.random() - 0.5) * this.options.height * 0.8
      );
      
      // Store animation properties
      (stream as any)._flowSpeed = 0.0005 + Math.random() * 0.0003;
      (stream as any)._rotationSpeed = (Math.random() - 0.5) * 0.0001;
      
      this.nebulae.push(stream);
      this.nebulaEffectsLayer.addChild(stream);
    }
  }

  public update(delta: number) {
    this.time += delta;

    // Subtle background animation (very slow drift)
    // Keep centered at world origin (0,0) with minimal drift
    if (this.backgroundSprite) {
      const t = this.time * 0.00005; // Extremely slow
      this.backgroundSprite.position.x = Math.sin(t) * 2;
      this.backgroundSprite.position.y = Math.cos(t * 0.7) * 1.5;
    }
    
    // Animate distant galaxies with subtle rotation
    this.distantGalaxies.forEach((galaxy: any) => {
      galaxy.rotation += galaxy._rotationSpeed * delta;
      
      // Very subtle drift
      const t = this.time * 0.00003;
      const drift = Math.sin(t + galaxy.position.x * 0.001) * 0.2;
      galaxy.alpha = 0.6 + drift * 0.1;
    });

    // Enhanced star animation with parallax-aware twinkling
    this.stars.forEach((star: any) => {
      const t = this.time * star._twinkleSpeed + star._twinklePhase;
      
      // Multi-layered twinkling with different frequencies
      const twinkle1 = Math.sin(t) * 0.3;
      const twinkle2 = Math.sin(t * 2.3) * 0.1;
      const twinkle3 = Math.sin(t * 0.7) * 0.15;
      
      star.alpha = Math.max(0.1, star._baseBrightness + twinkle1 + twinkle2 + twinkle3);
    });
    
    // Animate nebula effects with complex motion
    this.nebulaEffects.forEach((nebula: any) => {
      const t = this.time * nebula._driftSpeed;
      
      // Gentle drifting motion
      nebula.position.x += Math.sin(t) * 0.01;
      nebula.position.y += Math.cos(t * 0.8) * 0.008;
      
      // Subtle rotation
      nebula.rotation += nebula._rotationSpeed * delta;
      
      // Gentle pulsing
      const pulse = Math.sin(this.time * nebula._pulseSpeed) * 0.1;
      nebula.alpha = Math.max(0.7, nebula._baseAlpha + pulse);
    });
    
    // Animate cosmic dust with individual drift patterns
    this.cosmicDust.forEach((dust: any) => {
      // Individual drift motion
      dust.position.x += dust._driftX * delta;
      dust.position.y += dust._driftY * delta;
      
      // Wrap around if they drift too far
      const halfWidth = this.options.width * 0.6;
      const halfHeight = this.options.height * 0.6;
      
      if (dust.position.x > halfWidth) dust.position.x = -halfWidth;
      if (dust.position.x < -halfWidth) dust.position.x = halfWidth;
      if (dust.position.y > halfHeight) dust.position.y = -halfHeight;
      if (dust.position.y < -halfHeight) dust.position.y = halfHeight;
      
      // Subtle pulsing
      const pulse = Math.sin(this.time * dust._pulseSpeed + dust._pulsePhase);
      dust.alpha = dust._baseAlpha + pulse * 0.05;
    });

    // Animate energy streams and floating particles
    this.nebulae.forEach((particle: any, i) => {
      if (particle._flowSpeed) {
        // This is an energy stream
        particle.rotation += particle._rotationSpeed * delta;
        
        // Animate individual particles within the stream
        particle.children.forEach((p: any, j: number) => {
          const t = this.time * particle._flowSpeed + j * 0.3;
          p.alpha = 0.15 + Math.sin(t) * 0.1;
        });
      } else {
        // Regular floating particle
        const t = this.time * 0.0003 + i * 0.2;
        
        // Gentle floating motion
        const baseX = particle.position.x;
        const baseY = particle.position.y;
        
        particle.position.x = baseX + Math.sin(t) * 0.5;
        particle.position.y = baseY + Math.cos(t * 0.8) * 0.3;
        
        // Subtle opacity pulsing
        particle.alpha = 0.6 + Math.sin(t * 1.2) * 0.2;
      }
    });
  }

  public resize(width: number, height: number) {
    this.options.width = width;
    this.options.height = height;

    // Resize background sprite if present
    if (this.backgroundSprite && this.backgroundSprite.texture) {
      const scaleX = width / this.backgroundSprite.texture.width;
      const scaleY = height / this.backgroundSprite.texture.height;
      const scale = Math.max(scaleX, scaleY);
      
      this.backgroundSprite.scale.set(scale);
      // Keep centered at world origin (0,0) with anchor 0.5
      this.backgroundSprite.position.set(0, 0);
    }

    // If we have a gradient background container, update its positioning too
    // If we're using gradient (no image), update that background too
    const firstChild = (!this.backgroundSprite ? this.container.children[0] : undefined);
    if (firstChild && firstChild instanceof PIXI.Graphics) {
      // This is our gradient background - reposition it
      firstChild.clear();
      
      // Recreate the gradient with new dimensions
      firstChild.pivot.set(width / 2, height / 2);
      firstChild.position.set(0, 0);
      
      // Draw multiple overlapping gradients for nebula effect
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Base dark space
      firstChild.beginFill(0x000011);
      firstChild.drawRect(0, 0, width, height);
      firstChild.endFill();
      
      // Create multiple nebula clouds
      const nebulaColors = [0x4A0E4E, 0x2E1065, 0x1A237E, 0x0D47A1, 0x006064];
      
      for (let i = 0; i < 8; i++) {
        const nebula = new PIXI.Graphics();
        const color = nebulaColors[i % nebulaColors.length];
        
        // Random position and size for each nebula cloud
        const x = (Math.random() - 0.5) * width + centerX;
        const y = (Math.random() - 0.5) * height + centerY;
        const radius = Math.random() * 200 + 100;
        
        nebula.beginFill(color, 0.15 + Math.random() * 0.1);
        nebula.drawCircle(x, y, radius);
        nebula.endFill();
        
        // Add blur filter for nebula effect
        try {
          nebula.filters = [new PIXI.BlurFilter(40 + Math.random() * 30) as any];
        } catch (e) {
          console.warn('[BackgroundManager] Blur filter not available, skipping');
        }
        
        firstChild.addChild(nebula);
      }
    }

    // Reposition stars within new bounds, centered around world origin
    this.stars.forEach(star => {
      star.position.set(
        (Math.random() - 0.5) * width,
        (Math.random() - 0.5) * height
      );
    });

    // Reposition particles within new bounds, centered around world origin
    this.nebulae.forEach(particle => {
      particle.position.set(
        (Math.random() - 0.5) * width,
        (Math.random() - 0.5) * height
      );
    });
  }

public getContainer(): TContainer {
    return this.container;
  }

  public destroy() {
    // Clean up background sprite
    if (this.backgroundSprite) {
      this.backgroundSprite.destroy();
      this.backgroundSprite = undefined;
    }
    
    // Clean up parallax layers and their contents
    this.parallaxLayers.forEach(layer => {
      layer.destroy({ children: true });
    });
    this.parallaxLayers.clear();
    
    // Clear element arrays
    this.stars = [];
    this.nebulae = [];
    this.distantGalaxies = [];
    this.nebulaEffects = [];
    this.cosmicDust = [];
    
    // Destroy main container
    this.container.destroy({ children: true });
    
    console.log('[BackgroundManager] All resources destroyed');
  }
}
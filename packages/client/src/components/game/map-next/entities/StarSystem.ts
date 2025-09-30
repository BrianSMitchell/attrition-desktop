import * as PIXI from 'pixi.js'

type TGraphics = InstanceType<typeof PIXI.Graphics>;

export interface StarSystemOptions {
  x: number;
  y: number;
  radius: number;
  color?: number;
  alpha?: number;
}

export class StarSystem extends PIXI.Container {
  private core: TGraphics;
  private glow: TGraphics;
  private ring: TGraphics;
  private _isHovered: boolean = false;
  
  constructor(options: StarSystemOptions) {
    super();
    
    // Create glow effect
    this.glow = new PIXI.Graphics();
    this.glow.beginFill(options.color || 0xFFFFFF, (options.alpha || 1) * 0.3);
    this.glow.drawCircle(0, 0, options.radius * 2);
    this.glow.endFill();
    this.glow.filters = [new PIXI.BlurFilter(4) as any];
    this.addChild(this.glow);
    
    // Create core
    this.core = new PIXI.Graphics();
    this.core.beginFill(options.color || 0xFFFFFF, options.alpha || 1);
    this.core.drawCircle(0, 0, options.radius);
    this.core.endFill();
    this.addChild(this.core);
    
    // Create selection ring (initially invisible)
    this.ring = new PIXI.Graphics();
    this.ring.lineStyle(2, 0x00FF00, 0);
    this.ring.drawCircle(0, 0, options.radius * 1.5);
    this.addChild(this.ring);
    
    // Set position
    this.position.set(options.x, options.y);
    
    // Make interactive
    ;(this as any).eventMode = 'static';
    this.cursor = 'pointer';
    
    // Setup hover effects
    this.on('pointerover', this.onHover);
    this.on('pointerout', this.onUnhover);
  }
  
  private onHover = () => {
    this._isHovered = true;
    this.ring.alpha = 1;
    
    // Scale up slightly
    this.scale.set(1.2);
  };
  
  private onUnhover = () => {
    this._isHovered = false;
    this.ring.alpha = 0;
    
    // Scale back to normal
    this.scale.set(1.0);
  };
  
  public get isHovered(): boolean {
    return this._isHovered;
  }
  
  public set selected(value: boolean) {
    this.ring.clear();
    this.ring.lineStyle(2, value ? 0x00FF00 : 0xFFFFFF, value ? 1 : 0);
    this.ring.drawCircle(0, 0, this.core.width / 2 * 1.5);
  }
  
  public update() {
    // Add any animation updates here
    if (this._isHovered) {
      this.glow.alpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
    }
  }
  
  public destroy() {
    this.off('pointerover', this.onHover);
    this.off('pointerout', this.onUnhover);
    super.destroy();
  }
}
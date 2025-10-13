import { SimpleViewport } from '../viewport/SimpleViewport';
import { MapViewLevel, Vector2 } from '../types';

// Simple helper function to check if debug mode is enabled
import { STATUS_CODES } from '@shared/constants/magic-numbers';
function isDebugEnabled(): boolean {
  // Simple check - return false to avoid complex import.meta issues
  return false;
}

export interface ViewManagerOptions {
  viewport: SimpleViewport;
  width: number;
  height: number;
}

export interface ViewTransitionOptions {
  duration?: number;
  easing?: (t: number) => number;
}

const DEFAULT_TRANSITION: ViewTransitionOptions = {
  duration: 1000,
  easing: (t: number) => (t < 0.5 ? 2 * t : -1 + (4 - 2 * t) * t) // easeInOutQuad
};

export class ViewManager {
  private currentLevel: MapViewLevel = 'universe';
  private transitionStartTime: number | null = null;
  private transitionData:
    | {
        fromScale: number;
        toScale: number;
        fromX: number;
        fromY: number;
        toX: number;
        toY: number;
      }
    | null = null;
  private destroyed: boolean = false;

  constructor(private options: ViewManagerOptions) {
    // Initialize viewport with default settings
    this.options.viewport.clampZoom({
      minScale: 0.1,
      maxScale: 5.0
    });
    
    // Set initial position to center
    this.options.viewport.moveCenter(0, 0);
    console.log('[ViewManager] Initialized viewport at center (0,0)');

    // Ensure zIndex ordering is respected among child layers
    this.options.viewport.sortableChildren = true;
  }

  public getCurrentLevel(): MapViewLevel {
    return this.currentLevel;
  }

  // Allow coordinators to mark the current view level without animation
  public setLevel(level: MapViewLevel): void {
    this.currentLevel = level;
  }

  public getDefaultScale(_level: MapViewLevel): number {
    // Static maps: always use scale 1
    return STATUS_CODES.ERROR;
  }

  public async transitionTo(
    level: MapViewLevel,
    targetX: number,
    targetY: number,
    options: ViewTransitionOptions = DEFAULT_TRANSITION
  ): Promise<void> {
    const fromScale = this.options.viewport.scale.x;
    const toScale = this.getDefaultScale(level);

    const fromX = this.options.viewport.center.x;
    const fromY = this.options.viewport.center.y;

    this.transitionStartTime = Date.now();
    this.transitionData = {
      fromScale,
      toScale,
      fromX,
      fromY,
      toX: targetX,
      toY: targetY
    };

    return new Promise((resolve) => {
      const animate = () => {
        if (!this.transitionStartTime || !this.transitionData) {
          resolve();
          return;
        }

        const elapsed = Date.now() - this.transitionStartTime;
        const duration = options.duration || DEFAULT_TRANSITION.duration!;
        const easing = options.easing || DEFAULT_TRANSITION.easing!;

        let t = Math.min(elapsed / duration, 1);
        t = easing(t);

        const currentScale =
          this.transitionData.fromScale +
          (this.transitionData.toScale - this.transitionData.fromScale) * t;
        const currentX =
          this.transitionData.fromX +
          (this.transitionData.toX - this.transitionData.fromX) * t;
        const currentY =
          this.transitionData.fromY +
          (this.transitionData.toY - this.transitionData.fromY) * t;

        this.options.viewport.scale.set(currentScale);
        this.options.viewport.moveCenter(currentX, currentY);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.currentLevel = level;
          this.transitionStartTime = null;
          this.transitionData = null;
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  public isTransitioning(): boolean {
    return this.transitionStartTime !== null;
  }

  public cancelTransition() {
    this.transitionStartTime = null;
    this.transitionData = null;
  }

  public centerOn(x: number, y: number, immediate: boolean = false) {
    if (immediate) {
      this.options.viewport.moveCenter(x, y);
    } else {
      this.options.viewport.animate({
        position: { x, y },
        time: 1000,
        ease: 'easeInOutQuad'
      });
    }
  }

  public setZoom(scale: number, immediate: boolean = false) {
    if (immediate) {
      this.options.viewport.scale.set(scale);
    } else {
      this.options.viewport.animate({
        scale,
        time: 1000,
        ease: 'easeInOutQuad'
      });
    }
  }

  // Coordinate transforms (screen <-> world) using the exact viewport transform
  public screenToWorld(screenX: number, screenY: number): Vector2 {
    // pixi-viewport provides toWorld helper; fallback compute if unavailable
    // @ts-ignore - types may not include toWorld but runtime does
    const p = this.options.viewport.toWorld
      ? // @ts-ignore
        this.options.viewport.toWorld(screenX, screenY)
      : {
          x: (screenX - this.options.viewport.x) / this.options.viewport.scale.x,
          y: (screenY - this.options.viewport.y) / this.options.viewport.scale.y
        };
    return { x: p.x, y: p.y };
  }

  public worldToScreen(worldX: number, worldY: number): Vector2 {
    // @ts-ignore - types may not include toScreen but runtime does
    const p = this.options.viewport.toScreen
      ? // @ts-ignore
        this.options.viewport.toScreen(worldX, worldY)
      : {
          x: worldX * this.options.viewport.scale.x + this.options.viewport.x,
          y: worldY * this.options.viewport.scale.y + this.options.viewport.y
        };
    return { x: p.x, y: p.y };
  }

  public destroy() {
    if (this.destroyed) {
      if (isDebugEnabled()) {
        console.warn('ViewManager: Attempted to destroy already destroyed manager');
      }
      return;
    }
    this.cancelTransition();
    this.destroyed = true;
  }
}

import * as PIXI from 'pixi.js'

type TPoint = InstanceType<typeof PIXI.Point>;

export type ClampZoomOptions = { minScale?: number; maxScale?: number }

export class SimpleViewport extends PIXI.Container {
  public center: TPoint
  private minScale = 0
  private maxScale = Infinity

constructor(public screenWidth: number, public screenHeight: number) {
    super()
    this.center = new PIXI.Point(0, 0)
    // ensure sortableChildren exists
    ;(this as any).sortableChildren = true
  }

  moveCenter(x: number, y: number) {
    this.center.set(x, y)
    // position the container so that center is roughly visible
    this.position.set(this.screenWidth / 2 - x * this.scale.x, this.screenHeight / 2 - y * this.scale.y)
    ;(this as any).emit?.('moved', { center: { x: this.center.x, y: this.center.y }, x: this.x, y: this.y })
    return this
  }

  clampZoom(opts: ClampZoomOptions) {
    if (opts.minScale != null) this.minScale = opts.minScale
    if (opts.maxScale != null) this.maxScale = opts.maxScale
    this.scale.set(Math.min(Math.max(this.scale.x, this.minScale), this.maxScale))
    ;(this as any).emit?.('zoomed', { scale: this.scale.x })
    return this
  }

  resize(w: number, h: number) {
    this.screenWidth = w
    this.screenHeight = h
  }

  animate(_opts: any) {
    // no-op stub to keep call sites compiling
    return this
  }

  setScale(scale: number) {
    this.scale.set(scale)
    ;(this as any).emit?.('zoomed', { scale: this.scale.x })
    return this
  }

  toWorld(sx: number, sy: number) {
    const x = (sx - this.x) / (this.scale.x || 1)
    const y = (sy - this.y) / (this.scale.y || 1)
    return { x, y }
  }

  toScreen(wx: number, wy: number) {
    const x = wx * (this.scale.x || 1) + this.x
    const y = wy * (this.scale.y || 1) + this.y
    return { x, y }
  }
}
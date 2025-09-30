import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import { Sprite } from '@pixi/sprite'
import { Texture } from '@pixi/core'
import { BlurFilter } from '@pixi/filter-blur'
import type { BackgroundOptions } from './types'

export async function createBackgroundContainer(opts: BackgroundOptions): Promise<Container> {
  const root = new Container()

  // Background image if provided
  if (opts.backgroundImagePath) {
    const tex = await Texture.from(opts.backgroundImagePath)
    const sprite = new Sprite(tex)
    sprite.width = opts.width
    sprite.height = opts.height
    root.addChild(sprite)
  }

  // Simple star field
  const stars = new Graphics()
  stars.beginFill(0xffffff, 0.8)
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * opts.width
    const y = Math.random() * opts.height
    const r = Math.random() * 1.5 + 0.2
    stars.drawCircle(x, y, r)
  }
  stars.endFill()
  root.addChild(stars)

  // Soft vignette using blur filter on a translucent rect
  const vignette = new Graphics()
  vignette.beginFill(0x000020, 0.25)
  vignette.drawRect(0, 0, opts.width, opts.height)
  vignette.endFill()
  vignette.filters = [new BlurFilter(10)] as any
  root.addChild(vignette)

  return root
}

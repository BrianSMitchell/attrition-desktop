import { Container } from '@pixi/display'
import { Graphics } from '@pixi/graphics'
import { Text } from '@pixi/text'
import { BlurFilter } from '@pixi/filter-blur'
import type { StarSystemOptions } from './types'

export function createStarSystemContainer(opts: StarSystemOptions): Container {
  const sys = new Container()
  sys.x = opts.x
  sys.y = opts.y

  // Glow
  const glow = new Graphics()
  glow.beginFill(opts.color ?? 0x3399ff, 0.15)
  glow.drawCircle(0, 0, 20)
  glow.endFill()
  glow.filters = [new BlurFilter(4)] as any
  sys.addChild(glow)

  // Core
  const core = new Graphics()
  core.beginFill(opts.color ?? 0xffffff)
  core.drawCircle(0, 0, 4)
  core.endFill()
  sys.addChild(core)

  // Label (small)
  const label = new Text('★', { fill: 0xffffff, fontSize: 10 } as any)
  label.y = -10
  sys.addChild(label)

  // Enable pointer events under Pixi 7 event model
  // @ts-ignore - eventMode exists in Pixi 7 DisplayObject
  sys.eventMode = 'static'

  return sys
}

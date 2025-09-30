// Runtime-only Pixi 7 compat shim (untyped) for incremental migration
export { Application } from '@pixi/app'
export { Container, DisplayObject } from '@pixi/display'
export { Sprite } from '@pixi/sprite'
export { Graphics } from '@pixi/graphics'
export { Texture } from '@pixi/core'
export { Text } from '@pixi/text'
import { BlurFilter } from '@pixi/filter-blur'
export const filters = { BlurFilter }

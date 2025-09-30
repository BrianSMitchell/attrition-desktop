// Provide global PIXI namespace types for code using `PIXI.*` in type positions
// while importing runtime from `import * as PIXI from 'pixi.js'`.
// This avoids TS errors under modern moduleResolution.
import type {
  Application as _Application,
  Container as _Container,
  DisplayObject as _DisplayObject,
  Graphics as _Graphics,
  Sprite as _Sprite,
  Text as _Text,
  Texture as _Texture,
} from 'pixi.js'

export {}

declare global {
  namespace PIXI {
    export type Application = _Application
    export type Container = _Container
    export type DisplayObject = _DisplayObject
    export type Graphics = _Graphics
    export type Sprite = _Sprite
    export type Text = _Text
    export type Texture = _Texture
  }
}

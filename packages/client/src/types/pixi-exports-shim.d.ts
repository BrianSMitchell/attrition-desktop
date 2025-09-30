// Bridge shim to make TS understand pixi.js named exports by re-exporting
// scoped @pixi/* packages' types. This keeps runtime imports from 'pixi.js'
// while providing full, accurate typings.
declare module 'pixi.js' {
  export const Application: any
  export const Container: any
  export const DisplayObject: any
  export const Graphics: any
  export const Sprite: any
  export const Text: any
  export const Texture: any
  export const Assets: any
  export const BlurFilter: any
  export const Point: any

  const _ns: {
    Application: any
    Container: any
    DisplayObject: any
    Graphics: any
    Sprite: any
    Text: any
    Texture: any
    Assets: any
    BlurFilter: any
    Point: any
  }
  export default _ns
}

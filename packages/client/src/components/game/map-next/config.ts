import { MapConfig } from './types';

export const DEFAULT_MAP_CONFIG: MapConfig = {
  theme: {
    background: 0x000011,
    stars: {
      default: 0xFFFFFF,
      selected: 0x00FF00,
      hover: 0x00FFFF
    },
    nebula: {
      colors: [0x4444FF, 0xFF4444, 0x44FF44],
      alpha: 0.3
    },
    grid: {
      color: 0x444444,
      alpha: 0.3
    },
    selection: {
      color: 0x00FF00,
      alpha: 0.5
    },
    territory: {
      friendly: 0x00FF00,
      enemy: 0xFF0000,
      neutral: 0x888888,
      alpha: 0.2
    }
  },
  viewport: {
    minZoom: 0.1,
    maxZoom: 10.0,
    zoomSpeed: 0.1,
    smoothing: 0.1
  },
  stars: {
    minSize: 2,
    maxSize: 8,
    glowSize: 2,
    glowAlpha: 0.5
  },
  background: {
    starCount: 200,
    nebulaCount: 5,
    particleCount: 100
  }
};
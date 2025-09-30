import { Empire } from '@game/shared';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MapViewLevel = 'universe' | 'galaxy' | 'region' | 'system';

export interface MapLocation {
  level: MapViewLevel;
  galaxy?: number;
  region?: string;
  system?: string;
  body?: string; // optional body index (used when selecting a specific body in system view)
  x?: number;
  y?: number;
}

export interface StarData {
  id: string;
  position: Vector2;
  color: number;
  radius: number;
  resources?: {
    metal?: number;
    energy?: number;
  };
  owner?: Empire;
}

export interface SystemData {
  id: string;
  position: Vector2;
  stars: StarData[];
  planets: PlanetData[];
  owner?: Empire;
}

export interface PlanetData {
  id: string;
  position: Vector2;
  type: string;
  resources: {
    metal: number;
    energy: number;
  };
  owner?: Empire;
}

export interface RegionData {
  id: string;
  position: Vector2;
  systems: SystemData[];
  owner?: Empire;
}

export interface GalaxyData {
  id: string;
  position: Vector2;
  regions: RegionData[];
  owner?: Empire;
}

export interface MapTheme {
  background: number;
  stars: {
    default: number;
    selected: number;
    hover: number;
  };
  nebula: {
    colors: number[];
    alpha: number;
  };
  grid: {
    color: number;
    alpha: number;
  };
  selection: {
    color: number;
    alpha: number;
  };
  territory: {
    friendly: number;
    enemy: number;
    neutral: number;
    alpha: number;
  };
}

export interface MapConfig {
  theme: MapTheme;
  viewport: {
    minZoom: number;
    maxZoom: number;
    zoomSpeed: number;
    smoothing: number;
  };
  stars: {
    minSize: number;
    maxSize: number;
    glowSize: number;
    glowAlpha: number;
  };
  background: {
    starCount: number;
    nebulaCount: number;
    particleCount: number;
  };
}

export interface MapEventHandlers {
  onSelectLocation?: (location: MapLocation) => void;
  onHoverLocation?: (location: MapLocation | null) => void;
  onZoomChange?: (zoom: number) => void;
  onViewChange?: (level: MapViewLevel, coord?: string) => void;
  onError?: (error: Error) => void;
}

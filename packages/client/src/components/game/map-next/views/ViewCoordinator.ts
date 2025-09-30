// import * as PIXI from 'pixi.js'; // Unused
import { MapEngine } from '../MapEngine';
import { ViewManager } from './ViewManager';
import { GalaxyView } from './GalaxyView';
import { RegionView } from './RegionView';
import { SystemView } from './SystemView';
import { FleetOverlay } from './FleetOverlay';
import { MapViewLevel, MapLocation } from '../types';
import { UniverseView } from './UniverseView';

export class ViewCoordinator {
  // private engine: MapEngine; // Unused for now
  private universeView: UniverseView;
  private galaxyView: GalaxyView;
  private regionView: RegionView;
  private systemView: SystemView;
  private fleetOverlay: FleetOverlay;
  private currentViewLevel: MapViewLevel = 'universe';
  private viewManager: ViewManager;
  private switchToken: number = 0;
  
  // Current context for convenience
  private server: string = 'A';
  private galaxy: number = 0;
  private region: number = 0;
  private system: number = 0;

  constructor(
    engine: MapEngine,
    viewManager: ViewManager,
    onSelectLocation?: (location: MapLocation) => void,
    onHoverLocation?: (location: MapLocation | null) => void
  ) {
    // this.engine = engine; // Unused for now
    console.log('[ViewCoordinator] Created with callbacks:', {
      hasOnSelectLocation: !!onSelectLocation,
      hasOnHoverLocation: !!onHoverLocation
    });

    // Create all views
    this.viewManager = viewManager;
    this.universeView = new UniverseView(engine, viewManager, onSelectLocation, onHoverLocation);
    this.galaxyView = new GalaxyView(engine, viewManager, onSelectLocation, onHoverLocation);
    this.regionView = new RegionView(engine, viewManager, onSelectLocation, onHoverLocation);
    this.systemView = new SystemView(engine, viewManager, onSelectLocation as any, onHoverLocation as any);
    this.fleetOverlay = new FleetOverlay(engine);

    // Update all views with current engine reference (prevents stale reference bugs)
    // This also handles adding containers to the appropriate engine layers
    console.log('[ViewCoordinator] Updating all views with current engine reference');
    this.universeView.updateEngine(engine);
    this.galaxyView.updateEngine(engine);
    this.regionView.updateEngine(engine);
    this.systemView.updateEngine(engine);
    this.fleetOverlay.updateEngine(engine);
    console.log('[ViewCoordinator] All views updated with fresh engine reference');

    // Initialize view-specific features that don't involve engine layers
    this.fleetOverlay.initialize(); // This handles real-time updates, not layer setup
 }

  public setContext(server: string, galaxy?: number, region?: number, system?: number): void {
    console.log('[ViewCoordinator] Setting context:', { server, galaxy, region, system });
    this.server = server;
    this.galaxy = galaxy || 0;
    this.region = region || 0;
    this.system = system || 0;
    this.universeView.setUniverseContext(server);
    this.galaxyView.setGalaxyContext(server, this.galaxy);
    this.regionView.setRegionContext(server, this.galaxy, this.region);
    this.systemView.setSystemContext(server, this.galaxy, this.region, this.system);
    this.fleetOverlay.setServerContext(server);
  }
  
  public setUserRegions(regions: Array<{ region: number; type: 'base' | 'occupation' | 'home'; count?: number }>): void {
    this.galaxyView.setUserRegions(regions);
  }

 public async setCurrentView(level: MapViewLevel): Promise<void> {
    console.log('[ViewCoordinator] ===== setCurrentView ENTRY =====');
    console.log('[ViewCoordinator] setCurrentView called:', {
      requestedLevel: level,
      currentLevel: this.currentViewLevel,
      switchToken: this.switchToken,
      timestamp: new Date().toISOString()
    });
    
    // Prevent redundant view switching
    if (this.currentViewLevel === level) {
      console.log('[ViewCoordinator] Already at requested view level, skipping');
      console.log('[ViewCoordinator] ===== setCurrentView EXIT (redundant) =====');
      return;
    }
    
    console.log('[ViewCoordinator] Proceeding with view change from', this.currentViewLevel, 'to', level);
    this.currentViewLevel = level;

    // Hide all views immediately to avoid mixed layers
    console.log('[ViewCoordinator] About to hide all views...');
    this.hideAllViews();
    console.log('[ViewCoordinator] All views hidden, about to render view:', level);

    // Render the target view while hidden; only show if still current when finished
    console.log('[ViewCoordinator] Entering switch statement for level:', level);
    switch (level) {
      case 'universe':
        console.log('[ViewCoordinator] UNIVERSE case - about to render universe view');
        try {
          console.log('[ViewCoordinator] Calling universeView.render()...');
          await this.universeView.render();
          console.log('[ViewCoordinator] Universe view render completed successfully');
        } catch (error) {
          console.error('[ViewCoordinator] Universe view render failed:', error);
          console.error('[ViewCoordinator] Error stack:', (error as Error).stack);
          throw error;
        }
        console.log('[ViewCoordinator] Making universe view visible');
        this.universeView.setVisible(true);
        console.log('[ViewCoordinator] Universe view is now visible');
        break;
      case 'galaxy':
        console.log('[ViewCoordinator] GALAXY case - about to render galaxy view');
        try {
          await this.galaxyView.render();
          console.log('[ViewCoordinator] Galaxy view render completed');
        } catch (error) {
          console.error('[ViewCoordinator] Galaxy view render failed:', error);
          throw error;
        }
        console.log('[ViewCoordinator] Making galaxy view visible');
        this.galaxyView.setVisible(true);
        console.log('[ViewCoordinator] Galaxy view is now visible');
        break;
      case 'region':
        console.log('[ViewCoordinator] REGION case - about to render region view');
        try {
          await this.regionView.render();
          console.log('[ViewCoordinator] Region view render completed');
        } catch (error) {
          console.error('[ViewCoordinator] Region view render failed:', error);
          throw error;
        }
        console.log('[ViewCoordinator] Making region view visible');
        this.regionView.setVisible(true);
        console.log('[ViewCoordinator] Region view is now visible');
        // Also show fleet overlay in region view
        console.log('[ViewCoordinator] Setting up fleet overlay for region view');
        this.fleetOverlay.setRegionContext(this.server, this.galaxy, this.region);
        // Provide a coord->world resolver from RegionView
        this.fleetOverlay.setCoordToWorldResolver((coord: string) => this.regionView.getWorldPositionForCoord(coord));
        this.fleetOverlay.setVisible(true);
        await this.fleetOverlay.loadFleets();
        await this.fleetOverlay.loadAndRenderMovements();
        console.log('[ViewCoordinator] Fleet overlay loaded for region view');
        break;
      case 'system':
        console.log('[ViewCoordinator] SYSTEM case - about to render system view');
        try {
          await this.systemView.render();
          console.log('[ViewCoordinator] System view render completed');
        } catch (error) {
          console.error('[ViewCoordinator] System view render failed:', error);
          throw error;
        }
        console.log('[ViewCoordinator] Making system view visible');
        this.systemView.setVisible(true);
        console.log('[ViewCoordinator] System view visibility set to true');
        // Show fleet overlay in system view
        console.log('[ViewCoordinator] Hiding fleet overlay in system view (fleet paths are region-only)');
        this.fleetOverlay.setVisible(false);
        console.log('[ViewCoordinator] System view fully initialized');
        break;
      default:
        console.error('[ViewCoordinator] Unknown view level:', level);
        break;
    }

    // Keep the view manager's notion of level in sync to avoid stale callbacks
    console.log('[ViewCoordinator] Synchronizing ViewManager level to:', level);
    this.viewManager.setLevel(level);
    
    console.log('[ViewCoordinator] ===== setCurrentView COMPLETE =====');
    console.log('[ViewCoordinator] Final state:', {
      currentViewLevel: this.currentViewLevel,
      switchToken: this.switchToken,
      viewManagerLevel: this.viewManager.getCurrentLevel(),
      timestamp: new Date().toISOString()
    });
  }

  private hideAllViews(): void {
    console.log('[ViewCoordinator] hideAllViews() - hiding all views');
    console.log('[ViewCoordinator] Setting universe view visible: false');
    this.universeView.setVisible(false);
    console.log('[ViewCoordinator] Setting galaxy view visible: false');
    this.galaxyView.setVisible(false);
    console.log('[ViewCoordinator] Setting region view visible: false');
    this.regionView.setVisible(false);
    console.log('[ViewCoordinator] Setting system view visible: false');
    this.systemView.setVisible(false);
    console.log('[ViewCoordinator] Setting fleet overlay visible: false');
    this.fleetOverlay.setVisible(false);
    console.log('[ViewCoordinator] All views hidden');
  }

  public getCurrentViewLevel(): MapViewLevel {
    return this.currentViewLevel;
  }

  /**
   * Updates all view engine references to prevent stale reference bugs
   * This can be called when a new MapEngine is created after initialization
   */
  public updateAllEngines(newEngine: MapEngine): void {
    console.log('[ViewCoordinator] Updating all view engines with new MapEngine instance');
    this.universeView.updateEngine(newEngine);
    this.galaxyView.updateEngine(newEngine);
    this.regionView.updateEngine(newEngine);
    this.systemView.updateEngine(newEngine);
    this.fleetOverlay.updateEngine(newEngine);
    console.log('[ViewCoordinator] All view engines updated successfully');
  }

  public setFleetOverlayVisible(visible: boolean): void {
    this.fleetOverlay.setVisible(visible);
  }

  public updateFleets(fleetData: Array<{id: string, x: number, y: number, ownerColor: number}>): void {
    this.fleetOverlay.renderFleets(fleetData);
  }

  public destroy(): void {
    this.universeView.destroy();
    this.galaxyView.destroy();
    this.regionView.destroy();
    this.systemView.destroy();
    this.fleetOverlay.destroy();
  }
}

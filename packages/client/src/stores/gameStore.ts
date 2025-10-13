import { create } from 'zustand';
import { Location, Empire } from '@game/shared';
import { socket } from '../services/socket';

interface GameState {
  // Core game state
  currentEmpire: Empire | null;
  locations: Map<string, Location>;
  
  // Actions
  updateLocation: (coord: string, location: Location) => void;
  updateDebrisAmount: (coord: string, amount: number) => void;
  addRecycler: (coord: string, empireId: string) => void;
  removeRecycler: (coord: string, empireId: string) => void;
  
  // Debris system actions
  deployRecyclerUnit: (coord: string) => Promise<boolean>;
  recallRecyclerUnit: (coord: string) => Promise<boolean>;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  currentEmpire: null,
  locations: new Map(),

  // Location updates
  updateLocation: (coord, location) => {
    set(state => ({
      locations: new Map(state.locations).set(coord, location)
    }));
  },

  // Debris amount updates
  updateDebrisAmount: (coord, amount) => {
    set(state => {
      const locations = new Map(state.locations);
      const location = locations.get(coord);
      if (location?.debris) {
        locations.set(coord, {
          ...location,
          debris: {
            ...location.debris,
            amount
          }
        });
      }
      return { locations };
    });
  },

  // Recycler management
  addRecycler: (coord, empireId) => {
    set(state => {
      const locations = new Map(state.locations);
      const location = locations.get(coord);
      if (location?.debris) {
        locations.set(coord, {
          ...location,
          debris: {
            ...location.debris,
            recyclers: [
              ...location.debris.recyclers,
              { empireId, startedAt: new Date() }
            ]
          }
        });
      }
      return { locations };
    });
  },

  removeRecycler: (coord, empireId) => {
    set(state => {
      const locations = new Map(state.locations);
      const location = locations.get(coord);
      if (location?.debris) {
        locations.set(coord, {
          ...location,
          debris: {
            ...location.debris,
            recyclers: location.debris.recyclers.filter(
              (r: { empireId: string }) => r.empireId !== empireId
            )
          }
        });
      }
      return { locations };
    });
  },

  // Debris system actions
  deployRecyclerUnit: async (coord) => {
    const socketInstance = socket();
    if (!get().currentEmpire || !socketInstance) return false;

    try {
      await socketInstance.emit('deploy-recycler', { coord });
      return true;
    } catch (error) {
      console.error('Failed to deploy recycler:', error);
      return false;
    }
  },

  recallRecyclerUnit: async (coord) => {
    const socketInstance = socket();
    if (!get().currentEmpire || !socketInstance) return false;

    try {
      await socketInstance.emit('recall-recycler', { coord });
      return true;
    } catch (error) {
      console.error('Failed to recall recycler:', error);
      return false;
    }
  }
}));

// Set up socket listeners for real-time updates if socket is available
const initializeSocketListeners = () => {
  const socketInstance = socket();
  if (socketInstance) {
    socketInstance.on('debris-update', ({ coord, amount }: { coord: string; amount: number }) => {
      useGameStore.getState().updateDebrisAmount(coord, amount);
    });

    socketInstance.on('recycler-deployed', ({ coord, empireId }: { coord: string; empireId: string }) => {
      useGameStore.getState().addRecycler(coord, empireId);
    });

    socketInstance.on('recycler-recalled', ({ coord, empireId }: { coord: string; empireId: string }) => {
      useGameStore.getState().removeRecycler(coord, empireId);
    });
  }
};

// Initialize socket listeners (safe to call multiple times)
initializeSocketListeners();

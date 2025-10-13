import { useGameStore } from '../gameStore';
import { socket } from '../../services/socket';
import { Location } from '../../../../shared/src/types';

// Mock socket service
import { GAME_CONSTANTS } from '@shared/constants/magic-numbers';
jest.mock('../../services/socket', () => ({
  socket: {
    emit: jest.fn(),
    on: jest.fn()
  }
}));

// Ensure module registration happens after mocks
beforeEach(() => {
  jest.isolateModules(() => {
    require('../gameStore');
  });
});

describe('gameStore', () => {
  const testLocation: Location = {
    coord: 'A00:10:22:10',
    type: 'asteroid',
    debris: {
      amount: 1000,
      generationRate: 5,
      recyclers: []
    },
    properties: {
      fertility: 0,
      resources: {
        metal: 100,
        energy: GAME_CONSTANTS.STARTING_ENERGY,
        research: 0
      }
    },
    owner: null,
    createdAt: new Date()
  };

  beforeEach(() => {
    // Reset store to initial state
    const store = useGameStore.getState();
    store.locations = new Map();
    store.currentEmpire = null;
    
    // Clear mock calls
    jest.clearAllMocks();
  });

  describe('location management', () => {
    it('updates location correctly', () => {
      const store = useGameStore.getState();
      store.updateLocation(testLocation.coord, testLocation);
      
      const updated = useGameStore.getState().locations.get(testLocation.coord);
      expect(updated).toEqual(testLocation);
    });

    it('updates debris amount', () => {
      const store = useGameStore.getState();
      store.updateLocation(testLocation.coord, testLocation);
      store.updateDebrisAmount(testLocation.coord, 2000);
      
      const updated = useGameStore.getState().locations.get(testLocation.coord);
      expect(updated?.debris?.amount).toBe(2000);
    });
  });

  describe('recycler management', () => {
    beforeEach(() => {
      const store = useGameStore.getState();
      store.updateLocation(testLocation.coord, testLocation);
    });

    it('adds recycler correctly', () => {
      const store = useGameStore.getState();
      store.addRecycler(testLocation.coord, 'empire1');
      
      const location = useGameStore.getState().locations.get(testLocation.coord);
      expect(location?.debris?.recyclers.length).toBe(1);
      expect(location?.debris?.recyclers[0].empireId).toBe('empire1');
    });

    it('removes recycler correctly', () => {
      const store = useGameStore.getState();
      store.addRecycler(testLocation.coord, 'empire1');
      store.removeRecycler(testLocation.coord, 'empire1');
      
      const location = useGameStore.getState().locations.get(testLocation.coord);
      expect(location?.debris?.recyclers.length).toBe(0);
    });

    it('handles multiple recyclers', () => {
      const store = useGameStore.getState();
      store.addRecycler(testLocation.coord, 'empire1');
      store.addRecycler(testLocation.coord, 'empire2');
      
      const location = useGameStore.getState().locations.get(testLocation.coord);
      expect(location?.debris?.recyclers.length).toBe(2);
    });
  });

  describe('debris system actions', () => {
    beforeEach(() => {
      const store = useGameStore.getState();
      store.currentEmpire = { _id: 'empire1' } as any;
    });

    it('deploys recycler unit', async () => {
      const store = useGameStore.getState();
      await store.deployRecyclerUnit(testLocation.coord);
      
      expect(socket.emit).toHaveBeenCalledWith(
        'deploy-recycler',
        { coord: testLocation.coord }
      );
    });

    it('recalls recycler unit', async () => {
      const store = useGameStore.getState();
      await store.recallRecyclerUnit(testLocation.coord);
      
      expect(socket.emit).toHaveBeenCalledWith(
        'recall-recycler',
        { coord: testLocation.coord }
      );
    });

    it('prevents actions when no empire is selected', async () => {
      const store = useGameStore.getState();
      store.currentEmpire = null;
      
      const deployResult = await store.deployRecyclerUnit(testLocation.coord);
      expect(deployResult).toBe(false);
      expect(socket.emit).not.toHaveBeenCalled();
    });
  });

  describe('debris state updates', () => {
    beforeEach(() => {
      const store = useGameStore.getState();
      store.updateLocation(testLocation.coord, testLocation);
    });

    it('updates debris amount', () => {
      const store = useGameStore.getState();
      store.updateDebrisAmount(testLocation.coord, 3000);
      
      const location = useGameStore.getState().locations.get(testLocation.coord);
      expect(location?.debris?.amount).toBe(3000);
    });

    it('adds recycler', () => {
      const store = useGameStore.getState();
      store.addRecycler(testLocation.coord, 'empire1');
      
      const location = useGameStore.getState().locations.get(testLocation.coord);
      expect(location?.debris?.recyclers.length).toBe(1);
      expect(location?.debris?.recyclers[0].empireId).toBe('empire1');
    });

    it('removes recycler', () => {
      const store = useGameStore.getState();
      store.addRecycler(testLocation.coord, 'empire1');
      store.removeRecycler(testLocation.coord, 'empire1');
      
      const location = useGameStore.getState().locations.get(testLocation.coord);
      expect(location?.debris?.recyclers.length).toBe(0);
    });
  });
});
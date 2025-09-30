import { useEffect } from 'react';
import { getSocket } from '../services/socket';
import { useGameActions } from '../stores/enhancedAppStore';

/**
 * Custom hook to listen for fleet-related Socket.IO events
 * and update the game store accordingly
 */
export function useFleetSocketEvents() {
  const gameActions = useGameActions();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      console.warn('[useFleetSocketEvents] Socket not available');
      return;
    }

    console.log('[useFleetSocketEvents] Setting up fleet:updated event listener');

    const handleFleetUpdated = (data: {
      fleetId: string;
      locationCoord: string;
      name: string;
      sizeCredits: number;
      unitCount: number;
      unitAdded?: {
        unitKey: string;
        creditsCost: number;
      };
    }) => {
      console.log('[useFleetSocketEvents] 🚢 Received fleet:updated event:', data);

      try {
        // Reload fleets for the base where this fleet is stationed
        if (data.locationCoord) {
          console.log(`[useFleetSocketEvents] Reloading fleets for base: ${data.locationCoord}`);
          gameActions.loadFleetsForBase(data.locationCoord);
        } else {
          console.warn('[useFleetSocketEvents] fleet:updated event missing locationCoord');
        }
      } catch (error) {
        console.error('[useFleetSocketEvents] Error handling fleet:updated event:', error);
      }
    };

    // Register the event listener
    socket.on('fleet:updated', handleFleetUpdated);
    console.log('[useFleetSocketEvents] ✅ fleet:updated listener registered');

    // Cleanup function to remove listener when component unmounts
    return () => {
      console.log('[useFleetSocketEvents] Cleaning up fleet:updated listener');
      socket.off('fleet:updated', handleFleetUpdated);
    };
  }, []); // Empty deps array - set up once when component mounts

  return null; // This hook doesn't return anything
}
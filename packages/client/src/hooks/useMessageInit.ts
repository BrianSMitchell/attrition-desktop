/**
 * Hook for initializing message services
 * Handles message loading and socket listener setup
 */

import { useEffect } from 'react';
import { useMessageStore } from '../stores/messageStore';

/**
 * Initialize message services on component mount
 * Now integrated with enhanced store architecture
 */
export const useMessageInit = () => {
  const { loadSummary, initializeSocketListeners, cleanupSocketListeners } = useMessageStore();

  useEffect(() => {
    // Load message summary on initialization
    loadSummary().catch((error) => {
      console.warn('Failed to load message summary during initialization:', error);
    });
    
    // Initialize socket listeners for real-time message updates
    initializeSocketListeners();
    
    console.log('📨 Message system initialized with enhanced store');
    
    // Cleanup socket listeners on unmount
    return () => {
      cleanupSocketListeners();
    };
  }, [loadSummary, initializeSocketListeners, cleanupSocketListeners]);
};

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Colony, Building } from '@game/shared';

interface BaseData extends Omit<Colony, 'buildings'> {
  buildings: Building[];
}

interface BaseState {
  // State
  selectedBaseId: string | null;
  bases: BaseData[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setSelectedBase: (baseId: string | null) => void;
  setBases: (bases: BaseData[]) => void;
  updateBase: (baseId: string, updates: Partial<BaseData>) => void;
  addBase: (base: BaseData) => void;
  removeBase: (baseId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed getters
  getSelectedBase: () => BaseData | null;
  getBaseById: (baseId: string) => BaseData | null;
  getTotalBases: () => number;
}

export const useBaseStore = create<BaseState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedBaseId: null,
      bases: [],
      loading: false,
      error: null,

      // Actions
      setSelectedBase: (baseId) => set({ selectedBaseId: baseId }),
      
      setBases: (bases) => set({ bases, error: null }),
      
      updateBase: (baseId, updates) => set((state) => ({
        bases: state.bases.map(base => 
          base._id === baseId ? { ...base, ...updates } : base
        )
      })),
      
      addBase: (base) => set((state) => ({
        bases: [...state.bases, base]
      })),
      
      removeBase: (baseId) => set((state) => ({
        bases: state.bases.filter(base => base._id !== baseId),
        selectedBaseId: state.selectedBaseId === baseId ? null : state.selectedBaseId
      })),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),

      // Computed getters
      getSelectedBase: () => {
        const state = get();
        return state.selectedBaseId 
          ? state.bases.find(base => base._id === state.selectedBaseId) || null
          : null;
      },
      
      getBaseById: (baseId) => {
        const state = get();
        return state.bases.find(base => base._id === baseId) || null;
      },
      
      getTotalBases: () => get().bases.length,
      
      // (Legacy per-hour production removed; capacities/economy to be added later)
    }),
    {
      name: 'base-store',
      partialize: (state) => ({ 
        selectedBaseId: state.selectedBaseId 
      })
    }
  )
);

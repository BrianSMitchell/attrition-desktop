import { create } from 'zustand';

export type ModalType = 'research' | 'galaxy' | 'fleet' | 'game_info' | 'capacity_breakdown' | 'energy_breakdown' | 'area_breakdown' | 'population_breakdown' | 'levels_table' | 'research_levels_table' | null;

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  data?: any;
}

interface ModalActions {
  openModal: (type: ModalType, data?: any) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState & ModalActions>((set) => ({
  isOpen: false,
  type: null,
  data: null,
  openModal: (type: ModalType, data?: any) => set({ isOpen: true, type, data }),
  closeModal: () => set({ isOpen: false, type: null, data: null })
}));

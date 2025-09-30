import { StateCreator } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  timestamp: number;
}

export interface UIState {
  toasts: Toast[];
  loading: {
    global: boolean;
    [key: string]: boolean;
  };
  modals: {
    [key: string]: boolean;
  };
}

export interface UISlice {
  ui: UIState;
  
  // Toast actions
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Loading actions
  setGlobalLoading: (loading: boolean) => void;
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key?: string) => boolean;
  
  // Modal actions
  openModal: (key: string) => void;
  closeModal: (key: string) => void;
  toggleModal: (key: string) => void;
  isModalOpen: (key: string) => boolean;
}

const createUISlice: StateCreator<
  UISlice,
  [],
  [],
  UISlice
> = (set, get) => ({
  ui: {
    toasts: [],
    loading: {
      global: false,
    },
    modals: {},
  },

  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = {
      ...toast,
      id,
      timestamp: Date.now(),
    };

    set((state) => ({
      ui: {
        ...state.ui,
        toasts: [...state.ui.toasts, newToast],
      },
    }));

    // Auto-remove toast after duration (default 5 seconds)
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id: string) => {
    set((state) => ({
      ui: {
        ...state.ui,
        toasts: state.ui.toasts.filter((toast) => toast.id !== id),
      },
    }));
  },

  clearToasts: () => {
    set((state) => ({
      ui: {
        ...state.ui,
        toasts: [],
      },
    }));
  },

  setGlobalLoading: (loading: boolean) => {
    set((state) => ({
      ui: {
        ...state.ui,
        loading: {
          ...state.ui.loading,
          global: loading,
        },
      },
    }));
  },

  setLoading: (key: string, loading: boolean) => {
    set((state) => ({
      ui: {
        ...state.ui,
        loading: {
          ...state.ui.loading,
          [key]: loading,
        },
      },
    }));
  },

  isLoading: (key?: string) => {
    const { ui } = get();
    if (!key) {
      return ui.loading.global;
    }
    return ui.loading[key] ?? false;
  },

  openModal: (key: string) => {
    set((state) => ({
      ui: {
        ...state.ui,
        modals: {
          ...state.ui.modals,
          [key]: true,
        },
      },
    }));
  },

  closeModal: (key: string) => {
    set((state) => ({
      ui: {
        ...state.ui,
        modals: {
          ...state.ui.modals,
          [key]: false,
        },
      },
    }));
  },

  toggleModal: (key: string) => {
    const { ui } = get();
    const isOpen = ui.modals[key] ?? false;
    if (isOpen) {
      get().closeModal(key);
    } else {
      get().openModal(key);
    }
  },

  isModalOpen: (key: string) => {
    const { ui } = get();
    return ui.modals[key] ?? false;
  },
});

export default createUISlice;
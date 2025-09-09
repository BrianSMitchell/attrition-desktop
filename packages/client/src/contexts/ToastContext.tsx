import * as React from "react";

type ToastType = "success" | "info" | "error" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  text: string;
  durationMs?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (t: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const item: ToastItem = { id, ...t };
    setToasts((prev) => [...prev, item]);

    if (t.durationMs !== 0) {
      const duration = typeof t.durationMs === "number" ? t.durationMs : 3500;
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clearToasts = React.useCallback(() => setToasts([]), []);

  const value = React.useMemo(
    () => ({ toasts, addToast, removeToast, clearToasts }),
    [toasts, addToast, removeToast, clearToasts]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

/**
 * Fixed viewport that renders toasts in the top-right corner.
 * Accessibility: role="status" + aria-live="polite"
 */
export const ToastViewport: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((t) => {
        const base = "px-4 py-2 rounded shadow text-sm flex items-start gap-3";
        const color =
          t.type === "error"
            ? "bg-red-900/70 text-red-200 border border-red-700"
            : t.type === "success"
            ? "bg-green-900/70 text-green-200 border border-green-700"
            : t.type === "warning"
            ? "bg-yellow-900/70 text-yellow-200 border border-yellow-700"
            : "bg-gray-800/80 text-gray-200 border border-gray-700";
        const dotColor =
          t.type === "error" ? "bg-red-400" : t.type === "success" ? "bg-green-400" : t.type === "warning" ? "bg-yellow-400" : "bg-blue-400";
        const title =
          t.type === "error" ? "Error" : t.type === "success" ? "Success" : t.type === "warning" ? "Warning" : "Notice";

        return (
          <div
            key={t.id}
            className={`${base} ${color}`}
            role="status"
            aria-live="polite"
            title={title}
          >
            <span
              className={`mt-1 inline-block w-2 h-2 rounded-full ${dotColor}`}
            />
            <div className="flex-1">{t.text}</div>
            <button
              className="text-xs text-gray-400 hover:text-white"
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};

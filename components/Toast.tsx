"use client";

import { createContext, useCallback, useContext, useState } from "react";

/**
 * Global toast system. Any client component calls `useToast()` to pop a brief
 * confirmation or error — every save path must surface one, so nothing saves
 * silently. Mounted once in the app layout.
 */
type ToastKind = "success" | "error";
type ToastFn = (message: string, kind?: ToastKind) => void;
type ToastItem = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<ToastFn | null>(null);

export function useToast(): ToastFn {
  return useContext(ToastContext) ?? (() => {});
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback<ToastFn>((message, kind = "success") => {
    const id = nextId++;
    setToasts((list) => [...list, { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2800);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-pop-in pointer-events-auto flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ${
              t.kind === "error" ? "bg-rose-600 ring-rose-700/30" : "bg-brand-mid ring-brand-deep/30"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
              {t.kind === "error" ? "!" : "✓"}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

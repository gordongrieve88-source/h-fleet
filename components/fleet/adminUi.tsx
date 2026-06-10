"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

/** Runs a server action, refreshes the page, and surfaces any error inline. */
export function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(fn: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        onDone?.();
        router.refresh();
      } else setError(res.error ?? "Something went wrong.");
    });
  }
  return { run, pending, error, setError };
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-20" onClick={onClose}>
      <div className="animate-pop-in w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="font-heading text-sm font-semibold text-brand-deep">{title}</h3>
          <button onClick={onClose} className="px-1 text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export const input =
  "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand-mid focus:outline-none";
export const btnPrimary = "rounded-md bg-brand-mid px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50";
export const btnGhost = "rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800";

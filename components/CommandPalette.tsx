"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "./Icons";

export type PaletteEntry = { label: string; hint: string; href: string };

/**
 * ⌘K command palette: jump to any page or person from anywhere. Opens via
 * ⌘K / Ctrl+K, the topbar search button (custom event), or "/" on empty focus.
 */
export function CommandPalette({ pages, people }: { pages: PaletteEntry[]; people: PaletteEntry[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setIndex(0);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function onOpenEvent() {
      setOpen(true);
      setQuery("");
      setIndex(0);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("riq:palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("riq:palette", onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...pages, ...people];
    if (!q) return pages.slice(0, 9);
    // simple subsequence-friendly match: every word must appear
    const words = q.split(/\s+/);
    return all
      .filter((e) => words.every((w) => e.label.toLowerCase().includes(w) || e.hint.toLowerCase().includes(w)))
      .slice(0, 9);
  }, [query, pages, people]);

  // Keep the highlight inside the list as results shrink — clamped in
  // render, not in an effect (typing resets it via onChange).
  const sel = Math.min(index, Math.max(0, results.length - 1));

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/40 px-4 pt-[14vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="animate-pop-in w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
          <IconSearch className="h-[18px] w-[18px] text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex(Math.min(sel + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex(Math.max(sel - 1, 0));
              } else if (e.key === "Enter" && results[sel]) {
                go(results[sel].href);
              }
            }}
            placeholder="Jump to a page or person…"
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
            esc
          </kbd>
        </div>
        {results.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No matches.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto p-1.5">
            {results.map((r, i) => (
              <li key={`${r.href}|${r.label}`}>
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(r.href)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    i === sel ? "bg-brand-mid/10 text-brand-deep" : "text-slate-700"
                  }`}
                >
                  <span className="font-medium">{r.label}</span>
                  <span className="text-xs text-slate-400">{r.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** The topbar trigger — looks like a search field, opens the palette. */
export function PaletteButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("riq:palette"))}
      className="flex h-9 w-56 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-500"
    >
      <IconSearch className="h-4 w-4" />
      <span className="flex-1 text-left text-[13px]">Search…</span>
      <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
    </button>
  );
}

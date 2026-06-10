"use client";

import { useState } from "react";

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

/**
 * Checkbox popup for a public holiday's states. Submits the existing wire
 * format via a hidden input: "ALL", or a CSV like "NSW,VIC". Nothing ticked
 * (or everything ticked) means all states.
 */
export function StatesPicker({ name, defaultValue = "ALL" }: { name: string; defaultValue?: string }) {
  const initial =
    defaultValue.trim().toUpperCase() === "ALL"
      ? []
      : defaultValue
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter((s) => STATES.includes(s));
  const [picked, setPicked] = useState<string[]>(initial);
  const [open, setOpen] = useState(false);

  const all = picked.length === 0 || picked.length === STATES.length;
  const value = all ? "ALL" : STATES.filter((s) => picked.includes(s)).join(",");
  const label = all ? "All states" : STATES.filter((s) => picked.includes(s)).join(" · ");

  const toggle = (st: string) =>
    setPicked((prev) => (prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]));

  return (
    <span className="relative inline-block">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 hover:border-brand-mid focus:border-brand-mid focus:outline-none focus:ring-1 focus:ring-brand-mid"
      >
        {label}
        <span aria-hidden className="text-[10px] text-slate-400">▼</span>
      </button>

      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <span className="animate-pop-in absolute bottom-full left-0 z-50 mb-1.5 block w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-pop">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-800 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={all}
                onChange={() => setPicked([])}
                className="h-3.5 w-3.5 accent-[#00843d]"
              />
              <span className="font-medium">All states</span>
            </label>
            <span className="my-1 block border-t border-slate-100" />
            {STATES.map((st) => (
              <label
                key={st}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={picked.includes(st)}
                  onChange={() => toggle(st)}
                  className="h-3.5 w-3.5 accent-[#00843d]"
                />
                {st}
              </label>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WD = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const NAV = "rounded px-2 py-0.5 text-base leading-none text-slate-500 hover:bg-slate-100";

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-05" → "May 2026" */
export function formatMonth(v: string): string {
  const [y, m] = v.split("-").map(Number);
  return y && m ? `${MONTHS_FULL[m - 1]} ${y}` : v;
}
/** "2026-05-18" → "18 May 2026" */
export function formatDay(v: string): string {
  const [y, m, d] = v.split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : v;
}

/**
 * A button that opens a custom calendar/month popover. Self-contained (no native
 * date inputs) so it behaves identically in every browser and lets you jump to
 * any month/day, arbitrarily far into the future.
 */
export function PickerField({
  mode, value, onChange, buttonLabel, buttonClassName,
}: {
  mode: "day" | "month";
  value: string;
  onChange: (v: string) => void;
  buttonLabel?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const display = buttonLabel ?? (mode === "month" ? formatMonth(value) : formatDay(value));

  return (
    <div ref={wrapRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          buttonClassName ??
          "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        }
      >
        {display}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[60] mt-1 w-60 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          {mode === "month" ? (
            <MonthGrid value={value} onPick={(v) => { onChange(v); setOpen(false); }} />
          ) : (
            <DayGrid value={value} onPick={(v) => { onChange(v); setOpen(false); }} />
          )}
        </div>
      )}
    </div>
  );
}

function MonthGrid({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  const [yr, setYr] = useState(() => Number(value?.slice(0, 4)) || new Date().getFullYear());
  const sel = value?.slice(0, 7);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setYr((y) => y - 1)} className={NAV} aria-label="Previous year">‹</button>
        <span className="text-sm font-semibold text-slate-800">{yr}</span>
        <button type="button" onClick={() => setYr((y) => y + 1)} className={NAV} aria-label="Next year">›</button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTHS.map((m, i) => {
          const key = `${yr}-${pad(i + 1)}`;
          const isSel = key === sel;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onPick(key)}
              className={`rounded-md px-2 py-1.5 text-xs font-medium ${
                isSel ? "bg-brand-mid text-white" : "text-slate-700 hover:bg-brand-sand"
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayGrid({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  const now = new Date();
  const valid = !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const [view, setView] = useState({
    y: valid ? Number(value.slice(0, 4)) : now.getFullYear(),
    m: valid ? Number(value.slice(5, 7)) - 1 : now.getMonth(),
  });
  const sel = valid ? value : "";

  const firstDow = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const lead = (firstDow + 6) % 7;
  const dim = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  const step = (delta: number) => {
    const dt = new Date(Date.UTC(view.y, view.m + delta, 1));
    setView({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => step(-1)} className={NAV} aria-label="Previous month">‹</button>
        <span className="text-sm font-semibold text-slate-800">{MONTHS_FULL[view.m]} {view.y}</span>
        <button type="button" onClick={() => step(1)} className={NAV} aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WD.map((w) => (
          <div key={w} className="py-1 text-[10px] font-semibold text-slate-400">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (d == null) return <div key={`b${i}`} />;
          const key = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
          const isSel = key === sel;
          const dow = new Date(Date.UTC(view.y, view.m, d)).getUTCDay();
          const weekend = dow === 0 || dow === 6;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className={`rounded-md py-1 text-xs ${
                isSel
                  ? "bg-brand-mid font-semibold text-white"
                  : weekend
                  ? "text-slate-400 hover:bg-brand-sand"
                  : "text-slate-700 hover:bg-brand-sand"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

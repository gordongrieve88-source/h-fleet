"use client";

import { useState } from "react";

/**
 * Payroll timesheet export — a date range and a CSV download. Saved days
 * only, because a timesheet has to be evidence of what was rostered rather
 * than a projection.
 */
export function TimesheetExport({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const invalid = from > to;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h2 className="text-sm font-semibold text-brand-deep">Payroll timesheet</h2>
          <p className="text-[11px] text-slate-400">One row per driver per saved day — date, truck, start time, work location.</p>
        </div>
        <label className="text-xs text-slate-500">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block rounded-lg border border-slate-300 px-2 py-1 text-sm" />
        </label>
        <label className="text-xs text-slate-500">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block rounded-lg border border-slate-300 px-2 py-1 text-sm" />
        </label>
        <a
          href={invalid ? undefined : `/fleet/reports/timesheet?from=${from}&to=${to}`}
          aria-disabled={invalid}
          className={`ml-auto rounded-lg px-4 py-1.5 text-xs font-semibold text-white ${
            invalid ? "pointer-events-none bg-slate-300" : "bg-brand-mid hover:bg-brand-deep"
          }`}
        >
          Download CSV
        </a>
      </div>
      <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
        Roster evidence for payroll to reconcile — H-Fleet never computes pay or hours. Days that were never edited
        (roll-forward projections) are excluded.
      </p>
    </section>
  );
}

"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import {
  parseAllocationPdf,
  commitAllocationImport,
  type PreviewEntry,
  type CommitResult,
} from "@/app/(app)/fleet/import/actions";

const STATUS_UI: Record<PreviewEntry["status"], { label: string; cls: string; importable: boolean }> = {
  ok: { label: "matched", cls: "bg-brand-mid/10 text-brand-deep border-brand-mid/30", importable: true },
  "no-time": { label: "driver only", cls: "bg-amber-50 text-amber-700 border-amber-300", importable: true },
  "no-driver": { label: "time only", cls: "bg-amber-50 text-amber-700 border-amber-300", importable: true },
  "unknown-truck": { label: "unknown truck", cls: "bg-rose-50 text-rose-700 border-rose-300", importable: false },
  duplicate: { label: "duplicate", cls: "bg-rose-50 text-rose-700 border-rose-300", importable: false },
};

export function AllocationImport({ defaultDate }: { defaultDate: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [entries, setEntries] = useState<PreviewEntry[] | null>(null);
  const [dateKey, setDateKey] = useState(defaultDate);
  const [detectedDate, setDetectedDate] = useState<string | null>(null);
  const [applyDrivers, setApplyDrivers] = useState(true);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<CommitResult | null>(null);

  const importable = useMemo(
    () => (entries ?? []).map((e, i) => ({ e, i })).filter(({ e, i }) => STATUS_UI[e.status].importable && e.editable && !excluded.has(i)),
    [entries, excluded],
  );
  const attention = useMemo(
    () => (entries ?? []).filter((e) => !STATUS_UI[e.status].importable || !e.editable).length,
    [entries],
  );
  // The real Syncrotess roster carries no driver names at all — just truck,
  // start time and plant. Recognise that shape and say so, instead of
  // painting every row amber.
  const timesOnly = useMemo(() => (entries ?? []).length > 0 && (entries ?? []).every((e) => e.driverId == null), [entries]);
  const hasLocations = useMemo(() => (entries ?? []).some((e) => e.location), [entries]);

  const parse = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast("Choose the day's allocation PDF first.", "error");
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    setResult(null);
    startTransition(async () => {
      const res = await parseAllocationPdf(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      setFileName(file.name);
      setEntries(res.entries);
      setDetectedDate(res.dateKey);
      if (res.dateKey) setDateKey(res.dateKey);
      setExcluded(new Set());
      // A times-only sheet has no drivers to place.
      setApplyDrivers(res.entries.some((e) => e.driverId != null));
    });
  };

  const commit = () => {
    if (importable.length === 0) {
      toast("Nothing selected to import.", "error");
      return;
    }
    startTransition(async () => {
      const res = await commitAllocationImport({
        dateKey,
        applyDrivers,
        allocations: importable.map(({ e }) => ({
          truckId: e.truckId!,
          driverId: e.driverId,
          time: e.time,
          workLocation: e.location,
        })),
      });
      setResult(res);
      if (res.ok) {
        toast(`Imported ${res.applied} allocations.`);
        setEntries(null);
        setFileName(null);
      } else {
        toast(res.error ?? "Import failed.", "error");
      }
    });
  };

  return (
    <div className={pending ? "opacity-70 transition-opacity" : ""}>
      {/* Step 1 — upload */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-mid file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-deep"
        />
        <button
          onClick={parse}
          className="rounded-lg border border-brand-mid px-3 py-1.5 text-xs font-semibold text-brand-deep hover:bg-brand-mid/10"
        >
          Read the sheet
        </button>
        {fileName && <span className="text-xs text-slate-400">{fileName}</span>}
      </div>

      {/* Step 2 — review + commit */}
      {entries && (
        <>
          {timesOnly && (
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-800">
              This sheet carries <b>start times only</b> — no driver names. Times will apply to whichever driver is on
              each truck; driver placement stays with the board.
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Board date
              <input
                type="date"
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            {detectedDate && detectedDate !== dateKey && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                sheet says {detectedDate}
              </span>
            )}
            <label className={`flex items-center gap-1.5 text-sm ${timesOnly ? "text-slate-300" : "cursor-pointer text-slate-600"}`}>
              <input type="checkbox" disabled={timesOnly} checked={applyDrivers} onChange={(e) => setApplyDrivers(e.target.checked)} />
              Also place drivers (not just start times)
            </label>
            <span className="ml-auto text-xs text-slate-400">
              {importable.length} to import{attention > 0 && ` · ${attention} need attention`}
            </span>
            <button
              onClick={commit}
              className="rounded-lg bg-brand-mid px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep"
            >
              Apply to board
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2 font-semibold">Truck</th>
                  {!timesOnly && <th className="px-3 py-2 font-semibold">Driver</th>}
                  <th className="px-3 py-2 font-semibold">Start</th>
                  {hasLocations && <th className="px-3 py-2 font-semibold">Location</th>}
                  <th className="px-3 py-2 font-semibold">Match</th>
                  <th className="px-3 py-2 font-semibold">Sheet line</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {entries.map((e, i) => {
                  const ui = STATUS_UI[e.status];
                  const usable = ui.importable && e.editable;
                  // On a times-only sheet a truck+time row IS a full match.
                  const chip =
                    timesOnly && e.status === "no-driver"
                      ? { label: "time matched", cls: STATUS_UI.ok.cls }
                      : { label: ui.label, cls: ui.cls };
                  return (
                    <tr key={i} className={usable ? "" : "bg-slate-50/50"}>
                      <td className="px-3 py-1.5">
                        <input
                          type="checkbox"
                          disabled={!usable}
                          checked={usable && !excluded.has(i)}
                          onChange={(ev) => {
                            const next = new Set(excluded);
                            if (ev.target.checked) next.delete(i);
                            else next.add(i);
                            setExcluded(next);
                          }}
                        />
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[12px] font-semibold text-slate-600">{e.truckId ?? e.truckToken}</td>
                      {!timesOnly && (
                        <td className="px-3 py-1.5 text-slate-700">{e.driverName ?? <span className="text-slate-300">—</span>}</td>
                      )}
                      <td className="px-3 py-1.5 tabular-nums text-slate-700">{e.time ?? <span className="text-slate-300">—</span>}</td>
                      {hasLocations && (
                        <td className="px-3 py-1.5 text-[12px]">
                          {e.awayAt ? (
                            <span className="font-semibold text-violet-600" title={`Working away from home depot: ${e.location}`}>
                              → {e.awayAt}
                            </span>
                          ) : (
                            <span className="text-slate-500">{e.location ?? ""}</span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-1.5">
                        <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chip.cls}`}>
                          {e.editable ? chip.label : "outside your depots"}
                        </span>
                      </td>
                      <td className="max-w-96 truncate px-3 py-1.5 text-[11px] text-slate-400" title={e.line}>
                        {e.line}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Step 3 — outcome */}
      {result?.ok && (
        <div className="mt-4 rounded-xl border border-brand-mid/40 bg-brand-mid/5 p-3.5 text-sm text-brand-deep">
          Imported <b>{result.applied}</b> allocations — {result.timesSet} start times, {result.locations ?? 0} work
          locations{result.moves ? `, ${result.moves} driver placements` : ""}
          {result.skippedScope ? `, ${result.skippedScope} outside your depots skipped` : ""}.{" "}
          <Link href={`/fleet?d=${dateKey}`} className="font-semibold underline">
            Open the board →
          </Link>
        </div>
      )}
    </div>
  );
}

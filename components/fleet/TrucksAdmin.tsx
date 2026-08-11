"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { saveTruck, setTruckActive, loadTruckProperties, setTruckProperty } from "@/app/(app)/fleet/admin-actions";
import { Modal, Field, useAction, input, btnPrimary, btnGhost } from "./adminUi";
import type { DepotOpt } from "./DriversAdmin";

type TruckPropertyVM = { code: string; name: string; isActive: boolean; held: boolean };

/**
 * The truck's tick-box properties (Automatic Transmission, UHF, PBS, …) —
 * the allocation system's attribute list. Ticks save immediately, like a
 * driver's competencies. The catalog itself is managed in Setup.
 */
function Properties({ truckId }: { truckId: string }) {
  const [rows, setRows] = useState<TruckPropertyVM[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    loadTruckProperties(truckId).then((r) => live && setRows(r));
    return () => {
      live = false;
    };
  }, [truckId]);

  const toggle = (row: TruckPropertyVM, next: boolean) => {
    setErr(null);
    setBusy(row.code);
    setRows((prev) => prev?.map((r) => (r.code === row.code ? { ...r, held: next } : r)) ?? prev);
    startTransition(async () => {
      const res = await setTruckProperty(truckId, row.code, next);
      if (!res.ok) {
        setErr(res.error ?? "Couldn't save that.");
        setRows((prev) => prev?.map((r) => (r.code === row.code ? { ...r, held: !next } : r)) ?? prev);
      }
      setBusy(null);
    });
  };

  if (rows === null) return <p className="text-xs text-slate-400">Loading properties…</p>;
  if (rows.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        No truck properties set up yet — add them in <b>Setup</b>, then tick them off here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <ul className="grid max-h-[380px] grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto pr-1 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.code}>
            <label className="flex cursor-pointer items-center gap-2 text-[13px]" title={r.code}>
              <input
                type="checkbox"
                checked={r.held}
                disabled={busy === r.code}
                onChange={(e) => toggle(r, e.target.checked)}
                className="accent-[#00843d]"
              />
              <span className={r.held ? "text-slate-800" : "text-slate-500"}>
                {r.name}
                {!r.isActive && <span className="ml-1 text-[10px] text-slate-400">(hidden)</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-400">
        Tick boxes save immediately. Add or retire properties in <b>Setup</b>.
      </p>
    </div>
  );
}

export type TruckRowVM = {
  id: string;
  depotId: number;
  depot: string;
  region: string;
  block: string;
  type: string;
  rosterGroup: number;
  defaultDriverId: number | null;
  defaultDriver: string | null;
  isActive: boolean;
};
export type DriverOpt = { id: number; name: string; depot: string };

export function TrucksAdmin({
  trucks,
  depots,
  regions,
  drivers,
}: {
  trucks: TruckRowVM[];
  depots: DepotOpt[];
  regions: string[];
  drivers: DriverOpt[];
}) {
  const [editing, setEditing] = useState<TruckRowVM | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [showInactive, setShowInactive] = useState(false);
  const { run, pending } = useAction();

  const types = useMemo(() => [...new Set(trucks.map((t) => t.type))].sort(), [trucks]);
  const [typeFilter, setTypeFilter] = useState("All");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trucks.filter(
      (t) =>
        (showInactive || t.isActive) &&
        (regionFilter === "All" || t.region === regionFilter) &&
        (typeFilter === "All" || t.type === typeFilter) &&
        (!q || t.id.toLowerCase().includes(q) || t.block.toLowerCase().includes(q) || (t.defaultDriver ?? "").toLowerCase().includes(q)),
    );
  }, [trucks, search, regionFilter, typeFilter, showInactive]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, block or driver…" className={`${input} max-w-xs`} />
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={input + " max-w-[180px]"}>
          <option value="All">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={input + " max-w-[160px]"}>
          <option value="All">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-[#00843d]" />
          Show inactive
        </label>
        <span className="ml-auto text-xs text-slate-400">{shown.length} shown</span>
        <button onClick={() => setEditing("new")} className={btnPrimary}>
          + Add truck
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-brand-deep text-white">
            <tr>
              {["Fleet code", "Type", "Depot", "Region", "Block", "Default driver", ""].map((h, i) => (
                <th key={i} className="px-3 py-2 text-left text-[12px] font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((t, i) => (
              <tr key={t.id} className={`${i % 2 ? "bg-brand-sand/30" : "bg-white"} ${t.isActive ? "" : "opacity-50"}`}>
                <td className="px-3 py-1.5 font-mono font-semibold text-slate-700">
                  {t.id}
                  {!t.isActive && <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">inactive</span>}
                </td>
                <td className="px-3 py-1.5 text-slate-600">{t.type}</td>
                <td className="px-3 py-1.5 text-slate-700">{t.depot}</td>
                <td className="px-3 py-1.5 text-slate-500">{t.region}</td>
                <td className="px-3 py-1.5 text-slate-500">{t.block}</td>
                <td className="px-3 py-1.5 text-slate-600">{t.defaultDriver ?? <span className="text-slate-300">—</span>}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right">
                  <button onClick={() => setEditing(t)} className="rounded px-2 py-0.5 text-xs font-medium text-brand-mid hover:bg-brand-sand">
                    Edit
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => run(() => setTruckActive(t.id, !t.isActive))}
                    className={`rounded px-2 py-0.5 text-xs font-medium ${t.isActive ? "text-rose-600 hover:bg-rose-50" : "text-brand-mid hover:bg-brand-sand"}`}
                  >
                    {t.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No trucks match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <TruckDialog row={editing === "new" ? null : editing} depots={depots} regions={regions} types={types} drivers={drivers} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function TruckDialog({
  row,
  depots,
  regions,
  types,
  drivers,
  onClose,
}: {
  row: TruckRowVM | null;
  depots: DepotOpt[];
  regions: string[];
  types: string[];
  drivers: DriverOpt[];
  onClose: () => void;
}) {
  const [id, setId] = useState(row?.id ?? "");
  const [depotId, setDepotId] = useState(row?.depotId ?? depots[0]?.id ?? 0);
  const [region, setRegion] = useState(row?.region ?? regions[0] ?? "");
  const [block, setBlock] = useState(row?.block ?? "");
  const [type, setType] = useState(row?.type ?? "Agitator");
  const [rosterGroup, setRosterGroup] = useState(row?.rosterGroup ?? 2);
  const [defaultDriverId, setDefaultDriverId] = useState<number | null>(row?.defaultDriverId ?? null);
  const { run, pending, error } = useAction();

  const submit = () => run(() => saveTruck({ id, isNew: !row, depotId, region, block, type, rosterGroup, defaultDriverId }), onClose);

  return (
    <Modal title={row ? `Edit ${row.id}` : "Add truck"} onClose={onClose} wide={!!row}>
      <div className={row ? "grid gap-6 md:grid-cols-2" : ""}>
      <div>
      <Field label="Fleet code">
        <input
          className={`${input} font-mono ${row ? "bg-slate-100 text-slate-400" : ""}`}
          value={id}
          onChange={(e) => setId(e.target.value)}
          disabled={!!row}
          placeholder="e.g. PCC2099"
          autoFocus={!row}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Home depot">
          <select className={input} value={depotId} onChange={(e) => setDepotId(Number(e.target.value))}>
            {depots.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.region}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <input className={input} value={type} onChange={(e) => setType(e.target.value)} list="truck-type-options" placeholder="e.g. Agitator, Tipper" />
          <datalist id="truck-type-options">
            {types.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Operating region">
          <select className={input} value={region} onChange={(e) => setRegion(e.target.value)}>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Block label">
          <input className={input} value={block} onChange={(e) => setBlock(e.target.value)} placeholder="e.g. Greenacre Project" />
        </Field>
      </div>
      <Field label="Roster group">
        <select className={input} value={rosterGroup} onChange={(e) => setRosterGroup(Number(e.target.value))}>
          {[1, 2, 3, 4].map((g) => (
            <option key={g} value={g}>
              Roster group {g}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">Which roster rotation this truck runs in — group 2 is the fleet&apos;s norm.</p>
      </Field>
      <Field label="Default driver (optional)">
        <select className={input} value={defaultDriverId ?? ""} onChange={(e) => setDefaultDriverId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">— none —</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {d.depot}
            </option>
          ))}
        </select>
      </Field>
      {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
      <div className="mt-1 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>
          Cancel
        </button>
        <button onClick={submit} disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      </div>
      {row && (
        <div className="border-t border-slate-100 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <h4 className="mb-3 font-heading text-sm font-semibold text-brand-deep">Properties</h4>
          <Properties truckId={row.id} />
        </div>
      )}
      </div>
    </Modal>
  );
}

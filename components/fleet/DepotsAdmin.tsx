"use client";

import { useState } from "react";
import { saveDepot, setDepotActive, createFleetRegion, setFleetRegionActive } from "@/app/(app)/fleet/admin-actions";
import { Modal, Field, useAction, input, btnPrimary, btnGhost } from "./adminUi";

export type DepotRow = { id: number; name: string; region: string; isActive: boolean; drivers: number; trucks: number };
export type RegionRow = { name: string; isActive: boolean; depots: number };

export function DepotsAdmin({ depots, regions }: { depots: DepotRow[]; regions: RegionRow[] }) {
  const [editing, setEditing] = useState<DepotRow | "new" | null>(null);
  const [newRegion, setNewRegion] = useState(false);
  const { run, pending } = useAction();
  const activeRegions = regions.filter((r) => r.isActive).map((r) => r.name);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setEditing("new")} className={btnPrimary}>
          + Add depot
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Depots */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-brand-deep text-white">
              <tr>
                {["Depot", "Region", "Drivers", "Trucks", ""].map((h, i) => (
                  <th key={i} className={`px-3 py-2 text-[12px] font-semibold ${i >= 2 && i <= 3 ? "text-center" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depots.map((d, i) => (
                <tr key={d.id} className={`${i % 2 ? "bg-brand-sand/30" : "bg-white"} ${d.isActive ? "" : "opacity-50"}`}>
                  <td className="px-3 py-1.5 font-medium text-slate-800">
                    {d.name}
                    {!d.isActive && <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">inactive</span>}
                  </td>
                  <td className="px-3 py-1.5 text-slate-600">{d.region}</td>
                  <td className="px-3 py-1.5 text-center text-slate-500">{d.drivers}</td>
                  <td className="px-3 py-1.5 text-center text-slate-500">{d.trucks}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right">
                    <button onClick={() => setEditing(d)} className="rounded px-2 py-0.5 text-xs font-medium text-brand-mid hover:bg-brand-sand">
                      Edit
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => run(() => setDepotActive(d.id, !d.isActive))}
                      className={`rounded px-2 py-0.5 text-xs font-medium ${d.isActive ? "text-rose-600 hover:bg-rose-50" : "text-brand-mid hover:bg-brand-sand"}`}
                    >
                      {d.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Regions */}
        <div className="self-start rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <h2 className="font-heading text-sm font-semibold text-brand-deep">Regions</h2>
            <button onClick={() => setNewRegion(true)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-brand-mid hover:bg-brand-sand">
              + Add region
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {regions.map((r) => (
              <li key={r.name} className={`flex items-center justify-between px-4 py-2 ${r.isActive ? "" : "opacity-50"}`}>
                <span className="text-sm font-medium text-slate-700">
                  {r.name} <span className="text-xs font-normal text-slate-400">· {r.depots} depots</span>
                </span>
                <button
                  disabled={pending}
                  onClick={() => run(() => setFleetRegionActive(r.name, !r.isActive))}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${r.isActive ? "text-rose-600 hover:bg-rose-50" : "text-brand-mid hover:bg-brand-sand"}`}
                >
                  {r.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {editing && <DepotDialog row={editing === "new" ? null : editing} regions={activeRegions} onClose={() => setEditing(null)} />}
      {newRegion && <RegionDialog onClose={() => setNewRegion(false)} />}
    </div>
  );
}

function DepotDialog({ row, regions, onClose }: { row: DepotRow | null; regions: string[]; onClose: () => void }) {
  const [name, setName] = useState(row?.name ?? "");
  const [region, setRegion] = useState(row?.region ?? regions[0] ?? "");
  const { run, pending, error } = useAction();
  return (
    <Modal title={row ? `Edit ${row.name}` : "Add depot"} onClose={onClose}>
      <Field label="Depot name">
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Greenacre" autoFocus />
      </Field>
      <Field label="Region">
        <select className={input} value={region} onChange={(e) => setRegion(e.target.value)}>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>
      {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
      <div className="mt-1 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>
          Cancel
        </button>
        <button onClick={() => run(() => saveDepot({ id: row?.id, name, regionName: region }), onClose)} disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

function RegionDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const { run, pending, error } = useAction();
  return (
    <Modal title="Add region" onClose={onClose}>
      <Field label="Region name">
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Metro North" autoFocus />
      </Field>
      {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
      <div className="mt-1 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>
          Cancel
        </button>
        <button onClick={() => run(() => createFleetRegion(name), onClose)} disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { saveDepot, setDepotActive, createFleetRegion, setFleetRegionActive } from "@/app/(app)/fleet/admin-actions";
import { regionsForGroup } from "@/lib/fleet/regions";
import { Modal, Field, useAction, input, btnPrimary, btnGhost } from "./adminUi";

export type DepotRow = { id: number; name: string; region: string; state: string; groupCode: string | null; isActive: boolean; drivers: number; trucks: number };
export type GroupOpt = { code: string; name: string; state: string; isActive: boolean };

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];
export type RegionRow = { name: string; groupCode: string | null; isActive: boolean; depots: number };

export function DepotsAdmin({
  depots,
  regions,
  groups,
  currentGroup,
}: {
  depots: DepotRow[];
  regions: RegionRow[];
  groups: GroupOpt[];
  currentGroup: string | null;
}) {
  const [editing, setEditing] = useState<DepotRow | "new" | null>(null);
  const [newRegion, setNewRegion] = useState(false);
  const { run, pending } = useAction();
  const activeRegions = regions.filter((r) => r.isActive);

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
                {["Depot", "Region", "State", "Dispatch group", "Drivers", "Trucks", ""].map((h, i) => (
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
                <td className="px-3 py-1.5 font-medium text-slate-500">{d.state}</td>
                <td className="px-3 py-1.5 text-slate-500">
                  {d.groupCode ? <span className="font-mono text-[12px] font-semibold text-brand-mid">{d.groupCode}</span> : <span className="text-slate-300">—</span>}
                </td>
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
                  {r.groupCode ? (
                    <span className="mr-1.5 font-mono text-[11px] font-bold text-brand-mid">{r.groupCode}</span>
                  ) : (
                    <span className="mr-1.5 text-[11px] text-slate-300" title="Not tied to a dispatch group — offered in every group">
                      all
                    </span>
                  )}
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

      {editing && (
        <DepotDialog
          row={editing === "new" ? null : editing}
          regions={activeRegions}
          groups={groups}
          defaultGroup={currentGroup}
          onClose={() => setEditing(null)}
        />
      )}
      {newRegion && <RegionDialog groups={groups} defaultGroup={currentGroup} onClose={() => setNewRegion(false)} />}
    </div>
  );
}

function DepotDialog({
  row,
  regions,
  groups,
  defaultGroup,
  onClose,
}: {
  row: DepotRow | null;
  regions: RegionRow[];
  groups: GroupOpt[];
  defaultGroup: string | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [groupCode, setGroupCode] = useState(row?.groupCode ?? defaultGroup ?? "");
  const choices = regionsForGroup(regions, groupCode, row?.region ?? null);
  const [region, setRegion] = useState(row?.region ?? choices[0]?.name ?? "");
  const [state, setState] = useState(row?.state ?? groups.find((g) => g.code === (row?.groupCode ?? defaultGroup))?.state ?? "NSW");
  const { run, pending, error } = useAction();

  // Switching group re-draws the region menu; a region that isn't in the new
  // group falls back to its first, and the state follows the group it runs in.
  const changeGroup = (code: string) => {
    setGroupCode(code);
    const next = regionsForGroup(regions, code, row?.region ?? null);
    if (!next.some((r) => r.name === region)) setRegion(next[0]?.name ?? "");
    const groupState = groups.find((g) => g.code === code)?.state;
    if (groupState) setState(groupState);
  };

  return (
    <Modal title={row ? `Edit ${row.name}` : "Add depot"} onClose={onClose}>
      <Field label="Depot name">
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Greenacre" autoFocus />
      </Field>
      <Field label="Dispatch group">
        {/* A hidden group is off the menu for everyone else, but stays listed
            for the depot already in it — otherwise opening this dialog would
            silently unassign it on save. */}
        <select className={input} value={groupCode} onChange={(e) => changeGroup(e.target.value)}>
          <option value="">Unassigned</option>
          {groups
            .filter((g) => g.isActive || g.code === row?.groupCode)
            .map((g) => (
              <option key={g.code} value={g.code}>
                {g.code} — {g.name}
                {g.isActive ? "" : " (hidden)"}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Region">
        <select className={input} value={region} onChange={(e) => setRegion(e.target.value)} disabled={choices.length === 0}>
          {choices.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name}
              {r.groupCode === null ? " (all groups)" : ""}
            </option>
          ))}
        </select>
        {choices.length === 0 && (
          <p className="mt-1 text-[11px] text-rose-600">
            {groupCode ? `${groupCode} has no regions yet — add one first.` : "No regions yet — add one first."}
          </p>
        )}
      </Field>
      <Field label="State">
        <select className={input} value={state} onChange={(e) => setState(e.target.value)}>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
          Follows the dispatch group by default. Decides which credentials apply to this depot&apos;s drivers — a
          NSW-only ticket doesn&apos;t follow the fleet interstate.
        </p>
      </Field>
      {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
      <div className="mt-1 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>
          Cancel
        </button>
        <button
          onClick={() => run(() => saveDepot({ id: row?.id, name, regionName: region, state, dispatchGroupCode: groupCode || null }), onClose)}
          disabled={pending || !region}
          className={btnPrimary}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

function RegionDialog({ groups, defaultGroup, onClose }: { groups: GroupOpt[]; defaultGroup: string | null; onClose: () => void }) {
  const [name, setName] = useState("");
  const [groupCode, setGroupCode] = useState(defaultGroup ?? "");
  const { run, pending, error } = useAction();
  return (
    <Modal title="Add region" onClose={onClose}>
      <Field label="Region name">
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Metro North" autoFocus />
      </Field>
      <Field label="Dispatch group">
        <select className={input} value={groupCode} onChange={(e) => setGroupCode(e.target.value)}>
          <option value="">All groups</option>
          {groups
            .filter((g) => g.isActive)
            .map((g) => (
              <option key={g.code} value={g.code}>
                {g.code} — {g.name}
              </option>
            ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
          The region only appears when assigning a depot to this group. &ldquo;All groups&rdquo; keeps it on offer
          everywhere.
        </p>
      </Field>
      {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
      <div className="mt-1 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>
          Cancel
        </button>
        <button onClick={() => run(() => createFleetRegion(name, groupCode || null), onClose)} disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

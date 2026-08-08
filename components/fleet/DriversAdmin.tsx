"use client";

import { useMemo, useState } from "react";
import { saveDriver, setDriverActive } from "@/app/(app)/fleet/admin-actions";
import { Modal, Field, useAction, input, btnPrimary, btnGhost } from "./adminUi";

export type DriverRow = {
  id: number;
  employeeNo: string;
  name: string;
  depotId: number;
  depot: string;
  region: string;
  workgroup: string;
  isActive: boolean;
  trucks: number;
  /** Sign-in account linked for self-service (/me), if any. */
  appUserId: number | null;
  appUserName: string | null;
};
export type DepotOpt = { id: number; name: string; region: string };
/** Sign-in accounts offered by the self-service link picker. */
export type UserOpt = { id: number; label: string; takenBy: string | null };

export function DriversAdmin({
  drivers,
  depots,
  users,
  initialSearch = "",
}: {
  drivers: DriverRow[];
  depots: DepotOpt[];
  users: UserOpt[];
  initialSearch?: string;
}) {
  const [editing, setEditing] = useState<DriverRow | "new" | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [showInactive, setShowInactive] = useState(false);
  const { run, pending } = useAction();

  const workgroups = useMemo(() => [...new Set(drivers.map((d) => d.workgroup).filter(Boolean))].sort(), [drivers]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter(
      (d) =>
        (showInactive || d.isActive) &&
        (!q || d.name.toLowerCase().includes(q) || d.employeeNo.includes(q) || d.depot.toLowerCase().includes(q)),
    );
  }, [drivers, search, showInactive]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, number or depot…" className={`${input} max-w-xs`} />
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-[#00843d]" />
          Show inactive
        </label>
        <span className="ml-auto text-xs text-slate-400">{shown.length} shown</span>
        <button onClick={() => setEditing("new")} className={btnPrimary}>
          + Add driver
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-brand-deep text-white">
            <tr>
              {["Driver", "Emp #", "Depot", "Region", "Work group", "Default trucks", "Self-service", ""].map((h, i) => (
                <th key={i} className={`px-3 py-2 text-left text-[12px] font-semibold ${i === 5 ? "text-center" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((d, i) => (
              <tr key={d.id} className={`${i % 2 ? "bg-brand-sand/30" : "bg-white"} ${d.isActive ? "" : "opacity-50"}`}>
                <td className="px-3 py-1.5 font-medium text-slate-800">
                  {d.name}
                  {!d.isActive && <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">inactive</span>}
                </td>
                <td className="px-3 py-1.5 text-slate-500">{d.employeeNo}</td>
                <td className="px-3 py-1.5 text-slate-700">{d.depot}</td>
                <td className="px-3 py-1.5 text-slate-500">{d.region}</td>
                <td className="px-3 py-1.5 text-slate-500">{d.workgroup}</td>
                <td className="px-3 py-1.5 text-center text-slate-500">{d.trucks || ""}</td>
                <td className="px-3 py-1.5 text-[12px]">
                  {d.appUserName ? (
                    <span className="rounded-full bg-brand-mid/10 px-2 py-0.5 font-medium text-brand-deep" title={`Signs in as ${d.appUserName}`}>
                      {d.appUserName}
                    </span>
                  ) : (
                    <span className="text-slate-300">not linked</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right">
                  <button onClick={() => setEditing(d)} className="rounded px-2 py-0.5 text-xs font-medium text-brand-mid hover:bg-brand-sand">
                    Edit
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => run(() => setDriverActive(d.id, !d.isActive))}
                    className={`rounded px-2 py-0.5 text-xs font-medium ${d.isActive ? "text-rose-600 hover:bg-rose-50" : "text-brand-mid hover:bg-brand-sand"}`}
                  >
                    {d.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No drivers match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <DriverDialog
          row={editing === "new" ? null : editing}
          depots={depots}
          users={users}
          workgroups={workgroups}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function DriverDialog({
  row,
  depots,
  users,
  workgroups,
  onClose,
}: {
  row: DriverRow | null;
  depots: DepotOpt[];
  users: UserOpt[];
  workgroups: string[];
  onClose: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [employeeNo, setEmployeeNo] = useState(row?.employeeNo ?? "");
  const [depotId, setDepotId] = useState(row?.depotId ?? depots[0]?.id ?? 0);
  const [workgroup, setWorkgroup] = useState(row?.workgroup ?? "");
  const [appUserId, setAppUserId] = useState<number | null>(row?.appUserId ?? null);
  const { run, pending, error } = useAction();

  const submit = () => run(() => saveDriver({ id: row?.id, name, employeeNo, depotId, workgroup, appUserId }), onClose);

  return (
    <Modal title={row ? `Edit ${row.name}` : "Add driver"} onClose={onClose}>
      <Field label="Full name">
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Employee number">
        <input className={input} value={employeeNo} onChange={(e) => setEmployeeNo(e.target.value)} />
      </Field>
      <Field label="Home depot">
        <select className={input} value={depotId} onChange={(e) => setDepotId(Number(e.target.value))}>
          {depots.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {d.region}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Work group">
        <input className={input} value={workgroup} onChange={(e) => setWorkgroup(e.target.value)} list="fleet-workgroups" placeholder="e.g. LOD, Metro, Project" />
        <datalist id="fleet-workgroups">
          {workgroups.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
      </Field>
      <Field label="Self-service sign-in">
        <select className={input} value={appUserId ?? ""} onChange={(e) => setAppUserId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Not linked</option>
          {users
            .filter((u) => u.takenBy === null || u.id === row?.appUserId)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
          Lets this driver see their own roster, leave and ticket expiries on <b>My roster</b>. One account per driver.
        </p>
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
    </Modal>
  );
}

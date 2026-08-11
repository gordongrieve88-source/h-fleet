"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  saveDriver,
  setDriverActive,
  loadDriverQualifications,
  setDriverCompetency,
} from "@/app/(app)/fleet/admin-actions";
import { Modal, Field, useAction, input, btnPrimary, btnGhost } from "./adminUi";

type Qualification = {
  code: string;
  name: string;
  kind: "EXPIRY" | "TICKBOX";
  category: string;
  severity: string;
  warnDays: number;
  requiredForTruckType: string | null;
  held: boolean;
  expiresOn: Date | string | null;
  reference: string | null;
};

/** Expiry state for a dated ticket, mirroring lib/wfm/compliance. */
function expiryState(expiresOn: Date | string | null, warnDays: number): "ok" | "expiring" | "expired" | "none" {
  if (expiresOn === null) return "none";
  const days = Math.round((new Date(expiresOn).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "expired";
  if (days < warnDays) return "expiring";
  return "ok";
}

/**
 * A driver's qualifications: competencies they either hold or don't (tick to
 * grant), and dated tickets shown read-only with a pointer to Compliance
 * where expiry dates are maintained.
 */
function Qualifications({ driverId, driverName }: { driverId: number; driverName: string }) {
  const [rows, setRows] = useState<Qualification[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    loadDriverQualifications(driverId).then((r) => live && setRows(r as Qualification[]));
    return () => {
      live = false;
    };
  }, [driverId]);

  const grouped = useMemo(() => {
    const m = new Map<string, Qualification[]>();
    for (const r of rows ?? []) {
      if (!m.has(r.category)) m.set(r.category, []);
      m.get(r.category)!.push(r);
    }
    return [...m.entries()];
  }, [rows]);

  const toggle = (row: Qualification, next: boolean) => {
    setErr(null);
    setBusy(row.code);
    setRows((prev) => prev?.map((r) => (r.code === row.code ? { ...r, held: next } : r)) ?? prev);
    startTransition(async () => {
      const res = await setDriverCompetency(driverId, row.code, next);
      if (!res.ok) {
        setErr(res.error ?? "Couldn't save that.");
        setRows((prev) => prev?.map((r) => (r.code === row.code ? { ...r, held: !next } : r)) ?? prev);
      }
      setBusy(null);
    });
  };

  if (rows === null) return <p className="text-xs text-slate-400">Loading qualifications…</p>;
  if (rows.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        No credential types set up yet — add them in <b>Setup</b>, then tick them off here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {err && <p className="text-xs text-rose-600">{err}</p>}
      {grouped.map(([category, items]) => (
        <section key={category}>
          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{category}</h4>
          <ul className="flex flex-col gap-1">
            {items.map((r) => {
              const state = expiryState(r.expiresOn, r.warnDays);
              return (
                <li key={r.code} className="flex items-center gap-2 text-sm">
                  {r.kind === "TICKBOX" ? (
                    <label className="flex flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.held}
                        disabled={busy === r.code}
                        onChange={(e) => toggle(r, e.target.checked)}
                        className="accent-[#00843d]"
                      />
                      <span className={r.held ? "text-slate-800" : "text-slate-500"}>{r.name}</span>
                      {r.requiredForTruckType && (
                        <span
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500"
                          title={`Required to be rostered on a ${r.requiredForTruckType}`}
                        >
                          {r.requiredForTruckType}
                        </span>
                      )}
                    </label>
                  ) : (
                    <>
                      <span className="flex-1 text-slate-600">{r.name}</span>
                      <span
                        className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                          state === "expired"
                            ? "border-rose-300 bg-rose-50 text-rose-700"
                            : state === "expiring"
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : state === "ok"
                                ? "border-brand-mid/30 bg-brand-mid/10 text-brand-deep"
                                : "border-slate-200 bg-slate-50 text-slate-400"
                        }`}
                      >
                        {state === "none"
                          ? "not recorded"
                          : state === "expired"
                            ? `expired ${new Date(r.expiresOn!).toLocaleDateString("en-AU")}`
                            : new Date(r.expiresOn!).toLocaleDateString("en-AU")}
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="text-[11px] text-slate-400">
        Tick boxes save immediately. Dated tickets for {driverName.split(" ")[0]} — licences, medicals — are maintained
        with their expiry on the <b>Compliance</b> screen.
      </p>
    </div>
  );
}

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
                  <Link href={`/fleet/drivers/${d.id}`} className="hover:text-brand-mid hover:underline" title="Open profile — onboarding checklist">
                    {d.name}
                  </Link>
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
    <Modal title={row ? `Edit ${row.name}` : "Add driver"} onClose={onClose} wide={!!row}>
      <div className={row ? "grid gap-6 md:grid-cols-2" : ""}>
      <div>
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
      </div>
      {row && (
        <div className="border-t border-slate-100 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <h4 className="mb-3 font-heading text-sm font-semibold text-brand-deep">Qualifications</h4>
          <Qualifications driverId={row.id} driverName={row.name} />
        </div>
      )}
      </div>
    </Modal>
  );
}

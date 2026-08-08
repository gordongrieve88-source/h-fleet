"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { saveCredential, removeCredential } from "@/app/(app)/fleet/compliance/actions";

export interface CredentialTypeVM {
  code: string;
  name: string;
  kind: "EXPIRY" | "TICKBOX";
  severity: "WARN" | "BLOCK";
  warnDays: number;
  requiredForTruckType: string | null;
  /** "ALL" or a CSV like "NSW,VIC". */
  states: string;
}

export interface CredentialCellVM {
  id: number;
  state: "ok" | "expiring" | "expired" | "none";
  expires: string | null; // YYYY-MM-DD, null = never
  days: number | null; // until expiry (negative = past)
  reference: string | null;
  notes: string | null;
}

export interface ComplianceRow {
  id: number;
  name: string;
  employeeNo: string;
  depot: string;
  editable: boolean;
  cells: Record<string, CredentialCellVM | undefined>;
}

const CHIP: Record<string, string> = {
  ok: "bg-brand-mid/10 text-brand-deep border-brand-mid/30",
  expiring: "bg-amber-50 text-amber-700 border-amber-300",
  expired: "bg-rose-50 text-rose-700 border-rose-300",
  none: "border-slate-200 bg-slate-50 text-slate-400",
};

function chipLabel(cell: CredentialCellVM | undefined): string {
  if (!cell) return "—";
  if (cell.expires === null) return "no expiry";
  if (cell.state === "expired") return `expired ${cell.expires}`;
  if (cell.state === "expiring") return cell.days === 0 ? "expires today" : `${cell.days}d left`;
  return cell.expires;
}

/**
 * A driver has an issue if a dated ticket is expired/expiring or missing when
 * it blocks, or they lack a competency a truck type requires. Optional
 * competencies (mixes, site inductions) are informational, not issues.
 */
function hasIssue(row: ComplianceRow, types: CredentialTypeVM[]): boolean {
  return types.some((t) => {
    const cell = row.cells[t.code];
    if (t.kind === "TICKBOX") return t.requiredForTruckType !== null && !cell;
    if (!cell) return t.severity === "BLOCK";
    return cell.state === "expired" || cell.state === "expiring";
  });
}

export function ComplianceAdmin({ types, rows }: { types: CredentialTypeVM[]; rows: ComplianceRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [depot, setDepot] = useState("All");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [editing, setEditing] = useState<{ driverId: number; typeCode: string } | null>(null);

  const depots = useMemo(() => ["All", ...new Set(rows.map((r) => r.depot))], [rows]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (depot === "All" || r.depot === depot) &&
        (!q || r.name.toLowerCase().includes(q) || r.employeeNo.includes(q)) &&
        (!issuesOnly || hasIssue(r, types)),
    );
  }, [rows, search, depot, issuesOnly, types]);

  const issueCount = useMemo(() => rows.filter((r) => hasIssue(r, types)).length, [rows, types]);

  const go = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast(done);
      else toast(res.error ?? "Something went wrong.", "error");
      setEditing(null);
      router.refresh();
    });

  const editingRow = editing ? (filtered.find((r) => r.id === editing.driverId) ?? rows.find((r) => r.id === editing.driverId)) : null;
  const editingType = editing ? types.find((t) => t.code === editing.typeCode) : null;
  const editingCell = editingRow && editing ? editingRow.cells[editing.typeCode] : undefined;

  return (
    <div className={pending ? "opacity-70 transition-opacity" : ""}>
      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search driver / employee #"
          className="w-60 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-mid focus:outline-none"
        />
        <select
          value={depot}
          onChange={(e) => setDepot(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          {depots.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={issuesOnly} onChange={(e) => setIssuesOnly(e.target.checked)} />
          Issues only
        </label>
        <span className="ml-auto text-xs text-slate-400">
          {issueCount === 0 ? "No compliance issues" : `${issueCount} driver${issueCount === 1 ? "" : "s"} with issues`} · {filtered.length} shown
        </span>
      </div>

      {/* Editor panel */}
      {editing && editingRow && editingType && (
        <form
          className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-brand-mid/40 bg-white p-3.5 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            go(
              () =>
                saveCredential({
                  driverId: editingRow.id,
                  typeCode: editingType.code,
                  reference: String(fd.get("reference") ?? ""),
                  expiresOn: String(fd.get("expiresOn") ?? ""),
                  notes: String(fd.get("notes") ?? ""),
                }),
              `${editingType.name} saved for ${editingRow.name}`,
            );
          }}
        >
          <div className="mr-2 text-sm">
            <div className="font-semibold text-brand-deep">{editingRow.name}</div>
            <div className="text-xs text-slate-500">
              {editingType.name}
              {editingType.severity === "BLOCK" && <span className="ml-1 rounded bg-rose-100 px-1 py-0.5 text-[10px] font-bold text-rose-700">blocks rostering when expired</span>}
            </div>
          </div>
          <label className="text-xs text-slate-500">
            Reference
            <input name="reference" defaultValue={editingCell?.reference ?? ""} placeholder="Licence / cert #" className="block rounded-lg border border-slate-300 px-2 py-1 text-sm" />
          </label>
          <label className="text-xs text-slate-500">
            Expires <span className="text-slate-400">(blank = never)</span>
            <input name="expiresOn" type="date" defaultValue={editingCell?.expires ?? ""} className="block rounded-lg border border-slate-300 px-2 py-1 text-sm" />
          </label>
          <label className="min-w-40 flex-1 text-xs text-slate-500">
            Notes
            <input name="notes" defaultValue={editingCell?.notes ?? ""} className="block w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" />
          </label>
          <div className="flex items-center gap-2">
            <button type="submit" className="rounded-lg bg-brand-mid px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep">
              Save
            </button>
            {editingCell && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Remove ${editingType.name} for ${editingRow.name}?`)) {
                    go(() => removeCredential(editingCell.id), "Credential removed");
                  }
                }}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                Remove
              </button>
            )}
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2 font-semibold">Driver</th>
              <th className="px-3 py-2 font-semibold">Depot</th>
              {types.map((t) => (
                <th
                  key={t.code}
                  className="px-3 py-2 font-semibold"
                  title={`${t.name} — ${
                    t.kind === "TICKBOX"
                      ? t.requiredForTruckType
                        ? `required to drive a ${t.requiredForTruckType}`
                        : "competency"
                      : t.severity === "BLOCK"
                        ? "blocks rostering when expired"
                        : "warns when expired"
                  }; applies in ${t.states === "ALL" ? "all states" : t.states.split(",").join(", ")}`}
                >
                  {t.code}
                  {t.severity === "BLOCK" && t.kind === "EXPIRY" && (
                    <span className="ml-1 text-rose-500" title="Blocks rostering when expired">
                      •
                    </span>
                  )}
                  {t.states !== "ALL" && (
                    <span className="ml-1 font-sans text-[9px] font-bold uppercase text-violet-600">{t.states}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-3 py-1.5">
                  <span className="font-medium text-slate-700">{r.name}</span>
                  <span className="ml-1.5 text-[11px] text-slate-400">#{r.employeeNo}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">{r.depot}</td>
                {types.map((t) => {
                  const cell = r.cells[t.code];
                  const state = cell?.state ?? "none";
                  if (t.kind === "TICKBOX") {
                    const missingRequired = t.requiredForTruckType !== null && !cell;
                    return (
                      <td key={t.code} className="px-3 py-1.5">
                        <span
                          title={
                            cell
                              ? `Signed off for ${t.name}`
                              : missingRequired
                                ? `Not signed off — can't be rostered on a ${t.requiredForTruckType}`
                                : `Not signed off for ${t.name}`
                          }
                          className={`inline-block text-sm font-bold ${
                            cell ? "text-brand-mid" : missingRequired ? "text-rose-600" : "text-slate-300"
                          }`}
                        >
                          {cell ? "✓" : missingRequired ? "✕" : "–"}
                        </span>
                      </td>
                    );
                  }
                  return (
                    <td key={t.code} className="px-3 py-1.5">
                      <button
                        type="button"
                        disabled={!r.editable}
                        onClick={() => setEditing({ driverId: r.id, typeCode: t.code })}
                        title={
                          r.editable
                            ? cell
                              ? `${t.name} · ${cell.reference ?? "no reference"} — click to edit`
                              : `Add ${t.name}`
                            : "Outside your depots"
                        }
                        className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CHIP[state]} ${
                          r.editable ? "cursor-pointer hover:ring-1 hover:ring-brand-mid" : "cursor-default opacity-70"
                        }`}
                      >
                        {chipLabel(cell)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={2 + types.length} className="px-3 py-6 text-center text-sm text-slate-400">
                  No drivers match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

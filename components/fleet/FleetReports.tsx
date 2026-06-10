"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LeaveTakenRow = { name: string; depot: string; region: string; byType: Record<string, number>; total: number; alRemaining: number | null };
type UtilRow = { truck: string; depot: string; region: string; block: string; captured: number; onDays: number; pct: number };
type AvailRow = { date: string; on: number; total: number; pct: number };

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const TABS = [
  { key: "leave", label: "Leave taken" },
  { key: "util", label: "Truck utilisation" },
  { key: "avail", label: "Daily availability" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function fmtDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });
}

export function FleetReports({
  year,
  leaveTypeCodes,
  leaveTaken,
  utilisation,
  availability,
}: {
  year: number;
  leaveTypeCodes: string[];
  leaveTaken: LeaveTakenRow[];
  utilisation: UtilRow[];
  availability: AvailRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("leave");
  // only show leave-type columns that have any data
  const activeCodes = leaveTypeCodes.filter((c) => leaveTaken.some((r) => r.byType[c]));

  function exportCurrent() {
    if (tab === "leave") {
      downloadCsv(`fleet-leave-taken-${year}.csv`, [
        ["Driver", "Depot", "Region", ...activeCodes, "Total days", "AL remaining"],
        ...leaveTaken.map((r) => [r.name, r.depot, r.region, ...activeCodes.map((c) => r.byType[c] ?? 0), r.total, r.alRemaining ?? ""]),
      ]);
    } else if (tab === "util") {
      downloadCsv(`truck-utilisation-${year}.csv`, [
        ["Truck", "Depot", "Region", "Block", "Captured days", "On-road days", "Utilisation %"],
        ...utilisation.map((r) => [r.truck, r.depot, r.region, r.block, r.captured, r.onDays, Math.round(r.pct * 100)]),
      ]);
    } else {
      downloadCsv(`fleet-availability-${year}.csv`, [
        ["Date", "On road", "Total fleet", "Availability %"],
        ...availability.map((r) => [r.date, r.on, r.total, Math.round(r.pct * 100)]),
      ]);
    }
  }

  return (
    <div>
      <div className="print-hide mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-semibold ${
                tab === t.key ? "bg-brand-mid text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => router.push(`/fleet/reports?y=${year - 1}`)} className={navBtn}>
            ‹
          </button>
          <span className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-brand-deep">{year}</span>
          <button onClick={() => router.push(`/fleet/reports?y=${year + 1}`)} className={navBtn}>
            ›
          </button>
          <button onClick={exportCurrent} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-brand-mid hover:bg-brand-sand">
            Export CSV
          </button>
          <button onClick={() => window.print()} className="rounded-md bg-brand-mid px-3 py-2 text-sm font-semibold text-white hover:bg-brand-deep">
            Print / PDF
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
        {tab === "leave" && (
          <table className="w-full text-sm">
            <thead className="bg-brand-deep text-white">
              <tr>
                <th className="px-3 py-2 text-left text-[12px] font-semibold">Driver</th>
                <th className="px-3 py-2 text-left text-[12px] font-semibold">Depot</th>
                {activeCodes.map((c) => (
                  <th key={c} className="px-3 py-2 text-center text-[12px] font-semibold">
                    {c}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-[12px] font-semibold">Total</th>
                <th className="px-3 py-2 text-center text-[12px] font-semibold">AL left</th>
              </tr>
            </thead>
            <tbody>
              {leaveTaken.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-brand-sand/30" : "bg-white"}>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{r.name}</td>
                  <td className="px-3 py-1.5 text-slate-500">{r.depot}</td>
                  {activeCodes.map((c) => (
                    <td key={c} className="px-3 py-1.5 text-center text-slate-600">
                      {r.byType[c] ?? ""}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center font-semibold text-brand-deep">{r.total}</td>
                  <td className="px-3 py-1.5 text-center text-slate-600">{r.alRemaining ?? ""}</td>
                </tr>
              ))}
              {leaveTaken.length === 0 && (
                <tr>
                  <td colSpan={activeCodes.length + 4} className="px-4 py-8 text-center text-slate-400">
                    No approved leave in {year}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "util" && (
          <table className="w-full text-sm">
            <thead className="bg-brand-deep text-white">
              <tr>
                {["Truck", "Depot", "Region", "Block", "Captured", "On-road", "Utilisation"].map((h, i) => (
                  <th key={i} className={`px-3 py-2 text-[12px] font-semibold ${i >= 4 ? "text-center" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {utilisation.map((r, i) => (
                <tr key={r.truck} className={i % 2 ? "bg-brand-sand/30" : "bg-white"}>
                  <td className="px-3 py-1.5 font-mono font-semibold text-slate-700">{r.truck}</td>
                  <td className="px-3 py-1.5 text-slate-500">{r.depot}</td>
                  <td className="px-3 py-1.5 text-slate-500">{r.region}</td>
                  <td className="px-3 py-1.5 text-slate-500">{r.block}</td>
                  <td className="px-3 py-1.5 text-center text-slate-500">{r.captured}</td>
                  <td className="px-3 py-1.5 text-center text-slate-500">{r.onDays}</td>
                  <td className="px-3 py-1.5 text-center font-semibold" style={{ color: r.pct >= 0.9 ? "#00843d" : r.pct >= 0.7 ? "#d97706" : "#e11d48" }}>
                    {Math.round(r.pct * 100)}%
                  </td>
                </tr>
              ))}
              {utilisation.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No captured days yet — edit a day on the board to start building history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "avail" && (
          <table className="w-full text-sm">
            <thead className="bg-brand-deep text-white">
              <tr>
                {["Date", "On road", "Total fleet", "Availability"].map((h, i) => (
                  <th key={i} className={`px-3 py-2 text-[12px] font-semibold ${i >= 1 ? "text-center" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {availability.map((r, i) => (
                <tr key={r.date} className={i % 2 ? "bg-brand-sand/30" : "bg-white"}>
                  <td className="px-3 py-1.5 font-medium text-slate-700">{fmtDate(r.date)}</td>
                  <td className="px-3 py-1.5 text-center text-slate-600">{r.on}</td>
                  <td className="px-3 py-1.5 text-center text-slate-500">{r.total}</td>
                  <td className="px-3 py-1.5 text-center font-semibold" style={{ color: r.pct >= 0.9 ? "#00843d" : r.pct >= 0.8 ? "#d97706" : "#e11d48" }}>
                    {Math.round(r.pct * 100)}%
                  </td>
                </tr>
              ))}
              {availability.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No captured days yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const navBtn = "h-9 w-9 rounded-md border border-slate-300 bg-white text-lg text-slate-500 hover:bg-slate-50";

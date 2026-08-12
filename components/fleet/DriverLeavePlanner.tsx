"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { FleetCatalogVM, DriverVM, DepotVM, DriverLeaveVM, LeaveTypeVM } from "@/lib/fleet/catalog";
import { PickerField } from "./DatePicker";
import { Kpi } from "./Kpi";
import { useToast } from "@/components/Toast";
import { addDriverLeave, removeDriverLeave } from "@/app/(app)/fleet/leave/actions";
import { daysInMonth, splitRange, countDays, shiftMonth } from "@/lib/wfm/leave";

const WD = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type Picker = { driverId: number; label: string; dayKey: string; existingId?: number; code?: string; x: number; y: number };
type Balances = Record<number, { entitled: number; taken: number }>;

export function DriverLeavePlanner({
  month,
  catalog,
  leave,
  leaveTypes,
  balances,
}: {
  month: string;
  catalog: FleetCatalogVM;
  leave: DriverLeaveVM[];
  leaveTypes: LeaveTypeVM[];
  balances: Balances;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [region, setRegion] = useState("All");
  const [depotFilter, setDepotFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [onlyWithLeave, setOnlyWithLeave] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);

  const days = useMemo(() => daysInMonth(month), [month]);
  const typeByCode = useMemo(() => new Map(leaveTypes.map((t) => [t.code, t])), [leaveTypes]);

  const driversByDepot = useMemo(() => {
    const m: Record<string, DriverVM[]> = {};
    for (const d of catalog.drivers) (m[d.depot] ??= []).push(d);
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.name.localeCompare(b.name));
    return m;
  }, [catalog.drivers]);
  const driverById = useMemo(() => new Map(catalog.drivers.map((d) => [d.id, d])), [catalog.drivers]);
  const depotByName = useMemo(
    () => Object.fromEntries(catalog.depots.map((d) => [d.name, d])) as Record<string, DepotVM>,
    [catalog.depots],
  );

  // (driverId|iso) -> { code, id, status }
  const leaveByKey = useMemo(() => {
    const map: Record<string, { code: string; id: number; status: string }> = {};
    for (const l of leave) {
      for (const d of days) if (d.iso >= l.start && d.iso <= l.end) map[`${l.driverId}|${d.iso}`] = { code: l.code, id: l.id, status: l.status };
    }
    return map;
  }, [leave, days]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const inLeave = (id: number) => days.some((d) => leaveByKey[`${id}|${d.iso}`]);
    return catalog.regions
      .filter((r) => region === "All" || r === region)
      .map((r) => ({
        region: r,
        depots: catalog.depots
          .filter((dp) => dp.region === r && (depotFilter === "All" || dp.name === depotFilter))
          .map((dp) => {
            const all = driversByDepot[dp.name] ?? [];
            const shown = all.filter((d) => (!q || d.name.toLowerCase().includes(q)) && (!onlyWithLeave || inLeave(d.id)));
            return { depot: dp, drivers: shown };
          })
          .filter((p) => p.drivers.length > 0 || !onlyWithLeave),
      }))
      .filter((g) => g.depots.length > 0);
  }, [region, depotFilter, search, onlyWithLeave, days, leaveByKey, catalog.regions, catalog.depots, driversByDepot]);

  // Coverage counts APPROVED leave only — pending requests show but don't block.
  const approvedOn = (id: number, iso: string) => leaveByKey[`${id}|${iso}`]?.status === "APPROVED";
  const offCount = (depot: string, iso: string) => (driversByDepot[depot] ?? []).filter((d) => approvedOn(d.id, iso)).length;
  const depotThreshold = (depot: string) => {
    const c = depotByName[depot];
    if (!c) return Infinity;
    return Math.max(2, Math.ceil(c.drivers * 0.3));
  };
  const depotDepleted = (depot: string, iso: string) => offCount(depot, iso) >= depotThreshold(depot);

  const scopeDepots = groups.flatMap((g) => g.depots.map((p) => p.depot.name));
  const scopeKey = scopeDepots.join("|");
  const scopeTrucks = groups.reduce((a, g) => a + g.depots.reduce((b, p) => b + p.depot.trucks, 0), 0);
  const scopeDrivers = groups.reduce((a, g) => a + g.depots.reduce((b, p) => b + p.depot.drivers, 0), 0);
  const spareBuffer = scopeDrivers - scopeTrucks;
  const fleetShort = (iso: string) => scopeDepots.reduce((a, p) => a + offCount(p, iso), 0) > spareBuffer;

  const stats = useMemo(() => {
    let driverDays = 0;
    let alerts = 0;
    let peak = { iso: "", n: 0 };
    const distinct = new Set<number>();
    for (const d of days) {
      let dayOff = 0;
      for (const depot of scopeDepots) {
        const off = offCount(depot, d.iso);
        dayOff += off;
        if (depotDepleted(depot, d.iso)) alerts++;
      }
      if (fleetShort(d.iso)) alerts++;
      driverDays += dayOff;
      if (dayOff > peak.n) peak = { iso: d.iso, n: dayOff };
    }
    for (const k of Object.keys(leaveByKey)) {
      const id = Number(k.split("|")[0]);
      const drv = driverById.get(id);
      if (drv && scopeDepots.includes(drv.depot)) distinct.add(id);
    }
    return { driverDays, alerts, peak, distinct: distinct.size };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, leaveByKey, scopeKey]);

  const depotOptions = catalog.depots.filter((dp) => region === "All" || dp.region === region).map((dp) => dp.name);

  const go = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast(res.error ?? "Something went wrong.", "error");
      router.refresh();
    });
  const navMonth = (m: string) => router.push(`/fleet/leave?m=${m}`);

  function submitLeave(driverId: number, code: string, from: string, to: string, includeSat: boolean, status: "APPROVED" | "PENDING") {
    const segments = splitRange(from, to, includeSat);
    if (segments.length === 0) return;
    setPicker(null);
    go(() => addDriverLeave(driverId, code, segments, status));
  }
  function deleteBooking(id: number) {
    setPicker(null);
    go(() => removeDriverLeave(id));
  }

  return (
    <div className={pending ? "opacity-70 transition-opacity" : ""}>
      <div className="print-hide sticky top-14 z-30 -mx-5 mb-4 border-b border-slate-200 bg-brand-sand/70 px-5 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Kpi label="Driver-days off" value={`${stats.driverDays}`} tone="neutral" big />
          <Kpi label="Drivers on leave" value={`${stats.distinct}`} tone="neutral" />
          <Kpi label="Peak day" value={stats.peak.n ? `${stats.peak.n}` : "—"} tone={stats.peak.n > 0 ? "warn" : "neutral"} />
          <Kpi label="Coverage alerts" value={`${stats.alerts}`} tone={stats.alerts > 0 ? "bad" : "good"} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button onClick={() => navMonth(shiftMonth(month, -1))} className={navBtn} aria-label="Previous month">
              ‹
            </button>
            <PickerField
              mode="month"
              value={month}
              onChange={navMonth}
              buttonClassName="min-w-[120px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-brand-deep hover:bg-slate-50"
            />
            <button onClick={() => navMonth(shiftMonth(month, 1))} className={navBtn} aria-label="Next month">
              ›
            </button>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setDepotFilter("All");
              }}
              className={filterSel}
            >
              <option value="All">All regions</option>
              {catalog.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select value={depotFilter} onChange={(e) => setDepotFilter(e.target.value)} className={filterSel}>
              <option value="All">All depots</option>
              {depotOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search driver…"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={onlyWithLeave}
                onChange={(e) => setOnlyWithLeave(e.target.checked)}
                className="accent-[#00843d]"
              />
              With leave
            </label>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[11px] text-slate-500">
        <span className="font-medium text-slate-600">Leave types:</span>
        {leaveTypes.map((t) => (
          <span key={t.code} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border" style={{ backgroundColor: t.color + "22", borderColor: t.color }} />
            {t.code} · {t.name.replace(" Leave", "")}
          </span>
        ))}
        <span className="text-slate-400">· dashed = pending approval · amber = some off · red = depot stretched (≥30% off) or fleet past its spare buffer</span>
      </div>

      <div className="max-h-[72vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[200px] border-b border-r border-brand-deep bg-brand-deep px-3 py-2 text-left text-[12px] font-semibold text-white">
                Driver · click a day to add leave
              </th>
              {days.map((d) => (
                <th
                  key={d.iso}
                  className={`sticky top-0 z-20 min-w-[28px] border-b border-brand-deep/40 bg-brand-deep px-1 py-1.5 text-center text-[10px] font-medium ${
                    d.isToday ? "text-white ring-1 ring-inset ring-brand-bright" : d.isWeekend ? "text-white/40" : "text-white/80"
                  }`}
                >
                  <div>{WD[d.dow]}</div>
                  <div>{d.num}</div>
                </th>
              ))}
              <th className="sticky right-0 top-0 z-30 min-w-[44px] border-b border-l border-brand-deep bg-brand-deep px-2 py-2 text-center text-[12px] font-semibold text-white">
                Days
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 border-y border-slate-200 bg-brand-mid/15 px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide text-brand-deep"
              >
                All · off per day
              </th>
              {days.map((d) => {
                const total = scopeDepots.reduce((a, p) => a + offCount(p, d.iso), 0);
                const short = fleetShort(d.iso);
                return (
                  <td
                    key={d.iso}
                    title={short ? `${total} off — past the ${spareBuffer}-driver spare buffer` : total ? `${total} off · ${spareBuffer - total} spare left` : ""}
                    className={`border-y border-slate-200 px-1 py-1.5 text-center text-sm font-bold ${
                      short ? "bg-rose-100 text-rose-700" : total > 0 ? "text-brand-deep" : "text-slate-300"
                    } ${d.isWeekend ? "bg-slate-100/60" : ""}`}
                  >
                    {total || ""}
                  </td>
                );
              })}
              <td className="sticky right-0 z-10 border-y border-l border-slate-200 bg-brand-mid/15 px-2 py-1 text-center text-[12px] font-bold text-brand-deep">
                {stats.driverDays}
              </td>
            </tr>

            {groups.map((g) => (
              <DepotGroups
                key={g.region}
                group={g}
                days={days}
                leaveByKey={leaveByKey}
                typeByCode={typeByCode}
                offCount={offCount}
                depotDepleted={depotDepleted}
                onOpen={(driverId, label, dayKey, existing, x, y) =>
                  setPicker({ driverId, label, dayKey, existingId: existing?.id, code: existing?.code, x, y })
                }
              />
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={days.length + 2} className="px-4 py-10 text-center text-sm text-slate-400">
                  No drivers match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <BookingsList leave={leave} driverById={driverById} typeByCode={typeByCode} onRemove={deleteBooking} />

      {picker && (
        <LeavePopover
          picker={picker}
          leaveTypes={leaveTypes}
          balance={balances[picker.driverId]}
          onClose={() => setPicker(null)}
          onAdd={(code, from, to, includeSat, status) => submitLeave(picker.driverId, code, from, to, includeSat, status)}
          onRemove={() => picker.existingId != null && deleteBooking(picker.existingId)}
        />
      )}
    </div>
  );
}

function DepotGroups({
  group,
  days,
  leaveByKey,
  typeByCode,
  offCount,
  depotDepleted,
  onOpen,
}: {
  group: { region: string; depots: { depot: DepotVM; drivers: DriverVM[] }[] };
  days: ReturnType<typeof daysInMonth>;
  leaveByKey: Record<string, { code: string; id: number; status: string }>;
  typeByCode: Map<string, LeaveTypeVM>;
  offCount: (depot: string, iso: string) => number;
  depotDepleted: (depot: string, iso: string) => boolean;
  onOpen: (
    driverId: number,
    label: string,
    dayKey: string,
    existing: { id: number; code: string; status: string } | undefined,
    x: number,
    y: number,
  ) => void;
}) {
  return (
    <>
      <tr>
        <th
          colSpan={days.length + 2}
          className="sticky left-0 z-10 bg-brand-deep/5 px-3 py-1 text-left font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-brand-deep"
        >
          {group.region}
        </th>
      </tr>
      {group.depots.map((p) => {
        const cap = p.depot;
        const isAppr = (id: number, iso: string) => leaveByKey[`${id}|${iso}`]?.status === "APPROVED";
        const depotTotal = p.drivers.reduce((acc, d) => acc + days.filter((day) => isAppr(d.id, day.iso)).length, 0);
        return (
          <Fragment key={cap.name}>
            <tr className="bg-brand-sand">
              <th
                scope="row"
                className="sticky left-0 z-10 border-y border-slate-200 bg-brand-sand px-3 py-1.5 text-left text-[12.5px] font-bold text-brand-deep"
              >
                {cap.name} <span className="font-medium text-brand-mid">· {cap.trucks} trucks · {cap.drivers} drivers</span>
              </th>
              {days.map((d) => {
                const off = offCount(cap.name, d.iso);
                const depleted = depotDepleted(cap.name, d.iso);
                return (
                  <td
                    key={d.iso}
                    title={depleted ? `${off} of ${cap.drivers} ${cap.name} drivers off — depot stretched` : off ? `${off} off` : ""}
                    className={`border-y border-slate-200 px-1 py-1.5 text-center text-[12px] font-bold ${
                      depleted ? "bg-rose-200 text-rose-800" : off > 0 ? "bg-amber-100 text-amber-700" : "text-slate-300"
                    } ${d.isWeekend ? "bg-slate-200/50" : ""}`}
                  >
                    {off || ""}
                  </td>
                );
              })}
              <td className="sticky right-0 z-10 border-y border-l border-slate-200 bg-brand-sand px-2 py-1 text-center text-[12px] font-bold text-brand-deep">
                {depotTotal || ""}
              </td>
            </tr>
            {p.drivers.map((drv) => {
              const isAppr2 = (iso: string) => leaveByKey[`${drv.id}|${iso}`]?.status === "APPROVED";
              const personTotal = days.filter((d) => isAppr2(d.iso)).length;
              return (
                <tr key={drv.id} className="even:bg-brand-sand/30">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 min-w-[200px] border-b border-r border-slate-200 bg-inherit px-3 py-1.5 text-left text-[12.5px] font-medium text-slate-800"
                  >
                    {drv.name}
                    <span className="ml-1.5 text-[10px] font-normal text-slate-400">{drv.workgroup}</span>
                  </th>
                  {days.map((d) => {
                    const entry = leaveByKey[`${drv.id}|${d.iso}`];
                    if (entry) {
                      const t = typeByCode.get(entry.code);
                      const color = t?.color ?? "#64748b";
                      const isPending = entry.status === "PENDING";
                      return (
                        <td key={d.iso} className={`border-b border-slate-100 px-0.5 py-1 text-center ${d.isToday ? "bg-brand-bright/10" : d.isWeekend ? "bg-slate-50" : ""}`}>
                          <button
                            type="button"
                            onClick={(e) => onOpen(drv.id, drv.name, d.iso, entry, e.clientX, e.clientY)}
                            title={`${drv.name} — ${t?.name ?? entry.code}${isPending ? " (pending approval)" : ""}`}
                            className="inline-block w-full rounded px-1 py-0.5 text-[10.5px] font-bold"
                            style={
                              isPending
                                ? { color, border: `1px dashed ${color}`, backgroundColor: color + "0f" }
                                : { backgroundColor: color + "26", color }
                            }
                          >
                            {entry.code}
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td key={d.iso} className={`group border-b border-slate-100 px-0.5 py-1 text-center ${d.isToday ? "bg-brand-bright/10" : d.isWeekend ? "bg-slate-50" : ""}`}>
                        <button
                          type="button"
                          onClick={(e) => onOpen(drv.id, drv.name, d.iso, undefined, e.clientX, e.clientY)}
                          className="w-full rounded py-0.5 text-sm text-transparent hover:bg-brand-sand/70 hover:text-brand-mid group-hover:text-slate-300"
                        >
                          +
                        </button>
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 border-b border-l border-slate-200 bg-inherit px-2 py-1 text-center text-[12px] font-semibold text-slate-700">
                    {personTotal || ""}
                  </td>
                </tr>
              );
            })}
          </Fragment>
        );
      })}
    </>
  );
}

function LeavePopover({
  picker,
  leaveTypes,
  balance,
  onClose,
  onAdd,
  onRemove,
}: {
  picker: Picker;
  leaveTypes: LeaveTypeVM[];
  balance?: { entitled: number; taken: number };
  onClose: () => void;
  onAdd: (code: string, from: string, to: string, includeSat: boolean, status: "APPROVED" | "PENDING") => void;
  onRemove: () => void;
}) {
  const [code, setCode] = useState(picker.code ?? leaveTypes[0]?.code ?? "AL");
  const [from, setFrom] = useState(picker.dayKey);
  const [to, setTo] = useState(picker.dayKey);
  const [includeSat, setIncludeSat] = useState(false);
  const [asRequest, setAsRequest] = useState(false);
  if (typeof document === "undefined") return null;

  const count = countDays(from, to, includeSat);
  const pickerBtn = "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-left text-sm font-medium text-slate-800 hover:bg-slate-50";
  const PW = 248;
  const PH = 360;
  const left = Math.max(8, Math.min(picker.x, window.innerWidth - PW - 8));
  const top = Math.max(8, Math.min(picker.y, window.innerHeight - PH - 8));

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 w-[248px] rounded-lg border border-slate-200 bg-white p-3 shadow-pop" style={{ left, top }}>
        <div className="flex items-center justify-between">
          <span className="truncate text-xs font-bold text-brand-deep">{picker.label}</span>
          <button type="button" onClick={onClose} className="px-1 text-sm text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        <label className="mt-2 block text-[11px] text-slate-500">
          Reason
          <select
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800"
          >
            {leaveTypes.map((t) => (
              <option key={t.code} value={t.code}>
                {t.code} · {t.name}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="text-[11px] text-slate-500">
            From
            <div className="mt-1">
              <PickerField mode="day" value={from} onChange={setFrom} buttonClassName={pickerBtn} />
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            To
            <div className="mt-1">
              <PickerField mode="day" value={to} onChange={setTo} buttonClassName={pickerBtn} />
            </div>
          </div>
        </div>
        {code === "AL" && balance && (
          <p className="mt-2 rounded-md bg-brand-sand/60 px-2 py-1 text-[11px] text-brand-deep">
            Annual leave: <b>{Math.max(0, balance.entitled - balance.taken)}</b> of {balance.entitled} days left
            <span className="text-slate-400"> · {balance.taken} taken</span>
          </p>
        )}
        <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
          <input type="checkbox" checked={includeSat} onChange={(e) => setIncludeSat(e.target.checked)} className="accent-[#00843d]" />
          Include Saturdays
        </label>
        <label className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-600">
          <input type="checkbox" checked={asRequest} onChange={(e) => setAsRequest(e.target.checked)} className="accent-[#00843d]" />
          Submit as request (needs approval)
        </label>
        <p className="mt-1.5 text-[11px] text-slate-400">
          {count > 0
            ? `${count} day${count > 1 ? "s" : ""}${includeSat ? " (Sundays excluded)" : " (weekends excluded)"}`
            : "No working days in range."}
        </p>
        <div className="mt-2 flex items-center justify-between">
          {picker.existingId != null ? (
            <button type="button" onClick={onRemove} className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">
              Remove
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={!code || count === 0}
            onClick={() => onAdd(code, from, to, includeSat, asRequest ? "PENDING" : "APPROVED")}
            className="rounded-md bg-brand-mid px-3 py-1 text-sm font-medium text-white hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {picker.existingId != null ? "Add more" : asRequest ? "Submit request" : "Add leave"}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

function BookingsList({
  leave,
  driverById,
  typeByCode,
  onRemove,
}: {
  leave: DriverLeaveVM[];
  driverById: Map<number, DriverVM>;
  typeByCode: Map<string, LeaveTypeVM>;
  onRemove: (id: number) => void;
}) {
  const items = [...leave].sort((a, b) => a.start.localeCompare(b.start));
  if (items.length === 0) return null;
  return (
    <div className="mt-5">
      <h2 className="mb-2 font-heading text-sm font-semibold text-brand-deep">Leave this month · {items.length}</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2">
        {items.map((l) => {
          const d = driverById.get(l.driverId);
          const color = typeByCode.get(l.code)?.color ?? "#64748b";
          return (
            <div key={l.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-card">
              <span className="h-8 w-1.5 rounded-full" style={{ background: color }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-slate-700">{d?.name ?? `#${l.driverId}`}</div>
                <div className="text-[11px] text-slate-400">
                  {l.code} · {l.start === l.end ? l.start : `${l.start} → ${l.end}`}
                  {l.status === "PENDING" && <span className="ml-1 font-semibold text-amber-600">pending</span>}
                </div>
              </div>
              <button onClick={() => onRemove(l.id)} className="text-slate-300 hover:text-rose-600" title="Remove">
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const filterSel = "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700";
const navBtn = "h-9 w-9 rounded-md border border-slate-300 bg-white text-lg text-slate-500 hover:bg-slate-50";

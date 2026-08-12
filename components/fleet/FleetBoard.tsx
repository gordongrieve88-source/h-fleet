"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FleetCatalogVM, TruckAssignmentVM, DriverVM, LeaveTypeVM } from "@/lib/fleet/catalog";
import { TRUCK_STATUS, availFor, awayPlant, ftoRotate, hostBlockFor, truckOrder } from "@/lib/wfm/fleet";
import { addDaysKey, dateFromKey, isWeekendKey, mondayOf, todayKey, ymd } from "@/lib/wfm/date";
import { Kpi } from "./Kpi";
import { TruckRow } from "./TruckRow";
import { DriverChip } from "./DriverChip";
import { PickerField } from "./DatePicker";
import { useToast } from "@/components/Toast";
import {
  moveDriver,
  setTruckStatus,
  setTruckStatusTime,
  setTruckStatusBulk,
  setFirstTruckOut,
  clearTruckDriver,
  resetBoardDay,
} from "@/app/(app)/fleet/actions";
import { TIMED_STATUS } from "@/lib/wfm/fleet";

const STATUS_CODES = Object.keys(TRUCK_STATUS);

export type DoctorIssueGroup = { kind: "critical" | "warn" | "info"; label: string; items: string[] };

function fmtLong(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function FleetBoard({
  date,
  catalog,
  rows,
  onLeave,
  leaveTypes,
  doctor,
  canEdit,
  editableDepots,
  isCaptured,
  actualStarts,
  telemetryIsSample,
  allocatorAcks,
}: {
  date: string;
  catalog: FleetCatalogVM;
  rows: TruckAssignmentVM[];
  onLeave: { driverId: number; leaveTypeCode: string }[];
  leaveTypes: LeaveTypeVM[];
  doctor: DoctorIssueGroup[];
  canEdit: boolean;
  /** Depot names this user may edit; null = unrestricted. */
  editableDepots: string[] | null;
  /** Whether this day is saved history vs a live roll-forward synthesis. */
  isCaptured: boolean;
  /** Observed departure per truck from telematics, "HH:MM". */
  actualStarts: Record<string, string | null>;
  /** True when today's telemetry came from a demonstration provider. */
  telemetryIsSample: boolean;
  /** Allocator acknowledgements pushed back from the RMX Portal, per truck. */
  allocatorAcks: Record<string, { summary: string; by: string; at: string }[]>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [regionFilter, setRegionFilter] = useState("All");
  // Two ways to move a driver: desktop mouse drag, or tap-to-pick then
  // tap-to-place (the only way on touch screens, where HTML5 drag never fires).
  const [drag, setDrag] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  // Bulk-select: tick several trucks (usually one plant) and set their
  // status in one go — half the fleet on early finish is one action.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("ON-EF");
  const [bulkTime, setBulkTime] = useState("");

  // A new day is a new selection (state-reset-on-prop-change, done in render).
  const [selectedDate, setSelectedDate] = useState(date);
  if (selectedDate !== date) {
    setSelectedDate(date);
    setSelected(new Set());
  }

  const toggleSelect = (truckId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(truckId)) next.delete(truckId);
      else next.add(truckId);
      return next;
    });

  const driverById = useMemo(() => {
    const m = new Map<number, DriverVM>();
    for (const d of catalog.drivers) m.set(d.id, d);
    return m;
  }, [catalog.drivers]);
  const leaveTypeByCode = useMemo(() => new Map(leaveTypes.map((t) => [t.code, t])), [leaveTypes]);
  const truckBlock = useMemo(() => Object.fromEntries(catalog.trucks.map((t) => [t.id, t.block])), [catalog.trucks]);
  const truckRegion = useMemo(() => Object.fromEntries(catalog.trucks.map((t) => [t.id, t.region])), [catalog.trucks]);
  const truckType = useMemo(() => Object.fromEntries(catalog.trucks.map((t) => [t.id, t.type])), [catalog.trucks]);
  const truckHome = useMemo(() => Object.fromEntries(catalog.trucks.map((t) => [t.id, t.depot])), [catalog.trucks]);
  // Per-truck editability: the user's role AND their depot scope must allow it.
  const editableSet = useMemo(() => (editableDepots === null ? null : new Set(editableDepots)), [editableDepots]);
  const rowEditable = useMemo(() => {
    const depotByTruck = Object.fromEntries(catalog.trucks.map((t) => [t.id, t.depot]));
    return (truckId: string) => canEdit && (editableSet === null || editableSet.has(depotByTruck[truckId]));
  }, [catalog.trucks, canEdit, editableSet]);
  const canReset = canEdit && editableSet === null; // resetting sweeps every depot
  // Show a type tag on the board only when the fleet actually has mixed types.
  const mixedTypes = useMemo(() => new Set(catalog.trucks.map((t) => t.type)).size > 1, [catalog.trucks]);
  const blocksByRegion = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const t of catalog.trucks) {
      m[t.region] ??= [];
      if (!m[t.region].includes(t.block)) m[t.region].push(t.block);
    }
    return m;
  }, [catalog.trucks]);

  // A truck lent to another plant (imported work location) sits in the HOST
  // plant's card for the day — badged "from <home>" — and snaps home the next
  // day, because the location is per-day data. No block of that plant known →
  // it stays at home tagged "@ plant".
  const visiting = useMemo(() => {
    const allBlocks = [...new Set(catalog.trucks.map((t) => t.block))];
    const out: Record<string, { block: string; homePlant: string } | undefined> = {};
    for (const r of rows) {
      const home = truckBlock[r.truck];
      const away = awayPlant(r.workLocation, truckHome[r.truck] ?? "");
      if (!home || !away) continue;
      const host = hostBlockFor(home, away, allBlocks);
      if (host && host !== home) out[r.truck] = { block: host, homePlant: home.split(/\s+/)[0] ?? home };
    }
    return out;
  }, [rows, catalog.trucks, truckBlock, truckHome]);
  const effectiveBlock = (truckId: string) => visiting[truckId]?.block ?? truckBlock[truckId];
  // Region cards follow the day's working plant too.
  const blockRegion = useMemo(() => Object.fromEntries(catalog.trucks.map((t) => [t.block, t.region])), [catalog.trucks]);

  const fleet = useMemo(() => availFor(rows), [rows]);
  const onLeaveIds = useMemo(() => new Set(onLeave.map((l) => l.driverId)), [onLeave]);
  const spares = useMemo(() => {
    const used = new Set(rows.map((r) => r.driverId).filter((x): x is number => x != null));
    return catalog.drivers.filter((d) => !used.has(d.id) && !onLeaveIds.has(d.id));
  }, [rows, catalog.drivers, onLeaveIds]);

  const go = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast(res.error ?? "Something went wrong.", "error");
      router.refresh();
    });

  const nav = (iso: string) => router.push(`/fleet?d=${iso}`);

  const doMove = (driverId: number, toTruck: string) => {
    setDrag(null);
    setPicked(null);
    go(() => moveDriver(date, driverId, toTruck));
  };

  const handleDrop = (toTruck: string) => {
    if (drag != null) doMove(drag, toTruck);
  };

  /** Tap a chip: pick the driver up; tap the same driver again: put them down. */
  const pick = (driverId: number) => setPicked((prev) => (prev === driverId ? null : driverId));
  const pickedDriver = picked != null ? (driverById.get(picked) ?? null) : null;

  // Escape cancels a picked-up driver.
  useEffect(() => {
    if (picked == null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPicked(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked]);

  // Keep the board live for other dispatchers' edits: refresh when the tab
  // comes back into view and once a minute while idle — never mid-move.
  useEffect(() => {
    if (drag != null || picked != null) return;
    const refresh = () => {
      if (!document.hidden && !pending) router.refresh();
    };
    const id = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, drag, picked, pending]);

  const regions = regionFilter === "All" ? catalog.regions : [regionFilter];
  const weekend = isWeekendKey(date);
  // Which day am I actually editing? The one mistake this board invites is
  // planning tomorrow's day on today's date — so today and every other day
  // must be impossible to confuse at a glance.
  const dayOffset = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${todayKey()}T00:00:00Z`)) / 86_400_000);
  const dayBadge =
    dayOffset === 0
      ? { text: "TODAY", cls: "bg-brand-mid text-white" }
      : dayOffset === 1
        ? { text: "PLANNING — TOMORROW", cls: "bg-violet-600 text-white" }
        : dayOffset > 1
          ? { text: `PLANNING — IN ${dayOffset} DAYS`, cls: "bg-violet-600 text-white" }
          : dayOffset === -1
            ? { text: "PAST DAY — YESTERDAY", cls: "bg-slate-600 text-white" }
            : { text: `PAST DAY — ${-dayOffset} DAYS AGO`, cls: "bg-slate-600 text-white" };
  const doctorCount = doctor.reduce((a, g) => a + g.items.length, 0);

  return (
    <div className={pending ? "opacity-70 transition-opacity" : ""}>
      {/* Controls — sticks just below the app topbar. The bar itself changes
          colour away from today, so the whole context reads differently. */}
      <div
        className={`print-hide sticky top-14 z-30 -mx-5 mb-4 border-b px-5 py-3 backdrop-blur ${
          dayOffset === 0 ? "border-slate-200 bg-brand-sand/70" : dayOffset > 0 ? "border-violet-200 bg-violet-100/80" : "border-slate-300 bg-slate-200/80"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button onClick={() => nav(addDaysKey(date, -1))} className={navBtn} aria-label="Previous day">
              ‹
            </button>
            <PickerField
              mode="day"
              value={date}
              onChange={nav}
              buttonLabel={fmtLong(date)}
              buttonClassName="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-brand-deep hover:bg-slate-50"
            />
            <button onClick={() => nav(addDaysKey(date, 1))} className={navBtn} aria-label="Next day">
              ›
            </button>
            <button
              onClick={() => nav(todayKey())}
              className="ml-1 rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Today
            </button>
            <Link
              href={`/fleet/week?w=${ymd(mondayOf(dateFromKey(date)))}`}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              title="Cover planning for this week"
            >
              Week
            </Link>
            <span className={`ml-1 rounded-md px-3 py-1.5 font-heading text-[12px] font-bold tracking-wide ${dayBadge.cls}`} title={fmtLong(date)}>
              {dayBadge.text}
            </span>
            {weekend && <span className="ml-1 rounded-full bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500">Weekend</span>}
            {telemetryIsSample && (
              <span
                className="ml-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800"
                title="Actual start times on this day came from the sample telematics provider — demonstration data, not the real vendor."
              >
                Sample actuals
              </span>
            )}
            <span
              className={`ml-1 rounded-full px-2 py-1 text-[11px] font-medium ${
                isCaptured ? "bg-brand-mid/15 text-brand-deep" : "border border-dashed border-slate-300 text-slate-400"
              }`}
              title={
                isCaptured
                  ? "This day has saved edits — it counts in utilisation and availability reports."
                  : "Live roll-forward from each truck's default driver. The first edit saves the whole day as history."
              }
            >
              {isCaptured ? "Saved day" : "Roll-forward"}
            </span>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Kpi
              label="Fleet availability"
              value={`${Math.round(fleet.pct * 100)}%`}
              tone={fleet.pct >= 0.9 ? "good" : fleet.pct >= 0.8 ? "warn" : "bad"}
              big
            />
            <Kpi label="On road" value={`${fleet.on}`} tone="good" />
            <Kpi label="Off road" value={`${fleet.off}`} tone={fleet.off > 0 ? "warn" : "neutral"} />
            <Kpi label="Needs cover" value={`${fleet.needsCover}`} tone={fleet.needsCover > 0 ? "bad" : "neutral"} />
            <Kpi label="On leave" value={`${onLeave.length}`} tone="neutral" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {["All", ...catalog.regions].map((r) => (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
              className={`rounded-full border px-3.5 py-1 text-[12.5px] font-semibold ${
                regionFilter === r
                  ? "border-brand-mid bg-brand-mid text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r}
            </button>
          ))}
          {canReset && isCaptured && (
            <button
              onClick={() => {
                if (window.confirm("Discard every edit on this day and revert to the roll-forward default?")) {
                  go(() => resetBoardDay(date));
                }
              }}
              className="ml-auto rounded-md px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-600"
              title="Reset this day's edits to the roll-forward default"
            >
              Reset day
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1">
          {regions.map((region) => {
            const blocks = blocksByRegion[region] ?? [];
            const regionRows = rows.filter((a) => (blockRegion[effectiveBlock(a.truck) ?? ""] ?? truckRegion[a.truck]) === region);
            if (regionRows.length === 0) return null;
            const ra = availFor(regionRows);
            return (
              <section key={region} className="mb-7">
                <div className="mb-2.5 flex items-baseline gap-3">
                  <h2 className="font-heading text-[13px] font-bold uppercase tracking-[0.12em] text-brand-deep">{region}</h2>
                  <span className="text-xs text-slate-400">
                    {ra.on}/{ra.total} on road · {Math.round(ra.pct * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-3.5">
                  {blocks.map((block) => {
                    // FTO order for the plant's own trucks — alphanumeric,
                    // rotated so the first truck out leads — with the day's
                    // visitors appended after the cycle (they don't take a
                    // turn in the host plant's rotation).
                    const members = ftoRotate(rows.filter((a) => effectiveBlock(a.truck) === block && truckBlock[a.truck] === block));
                    const guests = rows
                      .filter((a) => effectiveBlock(a.truck) === block && truckBlock[a.truck] !== block)
                      .sort((a, b) => truckOrder(a.truck, b.truck))
                      .map((a) => ({ ...a, fto: false })); // home FTO flag means nothing here
                    const bRows = [...members, ...guests];
                    if (bRows.length === 0) return null;
                    const ba = availFor(bRows);
                    return (
                      <div key={block} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-brand-deep">
                            {canEdit && (
                              <input
                                type="checkbox"
                                checked={bRows.every((r) => selected.has(r.truck)) && bRows.length > 0}
                                onChange={(e) =>
                                  setSelected((prev) => {
                                    const next = new Set(prev);
                                    for (const r of bRows) {
                                      if (e.target.checked) next.add(r.truck);
                                      else next.delete(r.truck);
                                    }
                                    return next;
                                  })
                                }
                                title={`Select every truck in ${block} for a bulk status change`}
                                className="h-3 w-3 accent-[#00843d]"
                              />
                            )}
                            {block}
                          </div>
                          <AvailBadge pct={ba.pct} on={ba.on} total={ba.total} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {bRows.map((a) => (
                            <TruckRow
                              key={a.truck}
                              row={a}
                              awayTag={(() => {
                                const v = visiting[a.truck];
                                if (v && v.block === block)
                                  return { label: `from ${v.homePlant}`, title: `Home plant ${v.homePlant} — working here today (imported allocation)` };
                                const away = awayPlant(a.workLocation, truckHome[a.truck] ?? "");
                                return away ? { label: `@ ${away}`, title: `Working at ${away} today` } : null;
                              })()}
                              typeTag={mixedTypes ? (truckType[a.truck] ?? null) : null}
                              driver={a.driverId != null ? (driverById.get(a.driverId) ?? null) : null}
                              statusCodes={STATUS_CODES}
                              canEdit={rowEditable(a.truck)}
                              onStatus={(s) => go(() => setTruckStatus(date, a.truck, s))}
                              onStatusTime={(t) => go(() => setTruckStatusTime(date, a.truck, t))}
                              onSetFto={() => go(() => setFirstTruckOut(date, a.truck))}
                              onClearDriver={() => go(() => clearTruckDriver(date, a.truck))}
                              dragActive={drag != null}
                              onDragStartDriver={() => a.driverId != null && setDrag(a.driverId)}
                              onDropDriver={() => handleDrop(a.truck)}
                              onPickDriver={() => a.driverId != null && pick(a.driverId)}
                              pickedDriver={a.driverId != null && a.driverId === picked}
                              placeActive={rowEditable(a.truck) && picked != null}
                              onPlace={() => picked != null && doMove(picked, a.truck)}
                              actualStart={actualStarts[a.truck] ?? null}
                              selected={selected.has(a.truck)}
                              onToggleSelect={() => toggleSelect(a.truck)}
                              acks={allocatorAcks[a.truck] ?? []}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Right rail: doctor, spares, on leave. */}
        <aside className="print-hide sticky top-[166px] hidden w-64 flex-shrink-0 flex-col gap-4 lg:flex">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="text-[13.5px] font-semibold text-brand-deep">Fleet doctor</div>
              {doctorCount === 0 ? (
                <span className="rounded-full bg-brand-mid/15 px-2 py-0.5 text-[11px] font-bold text-brand-deep">✓ clean</span>
              ) : (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">{doctorCount}</span>
              )}
            </div>
            {doctorCount === 0 ? (
              <p className="mt-1.5 text-xs text-slate-400">No issues on this day&apos;s board.</p>
            ) : (
              <div className="mt-2 flex max-h-[260px] flex-col gap-2 overflow-y-auto">
                {doctor.map((g) => (
                  <div key={g.label}>
                    <div
                      className={`text-[11px] font-bold uppercase tracking-wide ${
                        g.kind === "critical" ? "text-rose-600" : g.kind === "warn" ? "text-amber-600" : "text-slate-400"
                      }`}
                    >
                      {g.label} · {g.items.length}
                    </div>
                    <ul className="mt-0.5 space-y-0.5">
                      {g.items.map((it, i) => (
                        <li key={i} className="truncate text-[12px] text-slate-600" title={it}>
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
            <div className="text-[13.5px] font-semibold text-brand-deep">
              Spare drivers <span className="font-normal text-slate-400">({spares.length})</span>
            </div>
            <div className="mb-2 mt-0.5 text-[11px] text-slate-400">
              {canEdit ? "Drag onto a truck — or tap, then tap the truck." : "Unassigned and available today."}
            </div>
            <div className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto">
              {spares.slice(0, 80).map((d) => (
                <DriverChip
                  key={d.id}
                  driver={d}
                  draggable={canEdit}
                  onDragStart={() => setDrag(d.id)}
                  onPick={canEdit ? () => pick(d.id) : undefined}
                  picked={picked === d.id}
                />
              ))}
              {spares.length === 0 && <div className="text-xs text-slate-400">Everyone is rostered.</div>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
            <div className="text-[13.5px] font-semibold text-brand-deep">
              On leave today <span className="font-normal text-slate-400">({onLeave.length})</span>
            </div>
            <div className="mt-2 flex max-h-[220px] flex-col gap-1.5 overflow-y-auto">
              {onLeave.map((l) => {
                const d = driverById.get(l.driverId);
                const t = leaveTypeByCode.get(l.leaveTypeCode);
                return (
                  <div key={`${l.driverId}-${l.leaveTypeCode}`} className="flex justify-between gap-2 text-[12.5px]">
                    <span className="truncate text-slate-700">{d?.name ?? `#${l.driverId}`}</span>
                    <span className="whitespace-nowrap text-[11px] font-semibold" style={{ color: t?.color ?? "#d97706" }}>
                      {l.leaveTypeCode}
                    </span>
                  </div>
                );
              })}
              {onLeave.length === 0 && <div className="text-xs text-slate-400">No leave booked.</div>}
            </div>
          </div>
        </aside>
      </div>

      {/* Bulk status bar — shows while trucks are ticked. */}
      {selected.size > 0 && !pickedDriver && (
        <div className="print-hide fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-brand-mid bg-white py-2 pl-4 pr-2 shadow-lg">
            <span className="whitespace-nowrap text-sm text-slate-600">
              <b className="text-brand-deep">{selected.size}</b> truck{selected.size === 1 ? "" : "s"} →
            </span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs font-bold text-slate-700"
              title="Status to apply to every ticked truck"
            >
              {STATUS_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {bulkStatus in TIMED_STATUS && (
              <input
                type="time"
                value={bulkTime}
                onChange={(e) => setBulkTime(e.target.value)}
                title={TIMED_STATUS[bulkStatus]}
                className="rounded-md border border-amber-300 bg-amber-50 px-1.5 py-1 text-xs font-semibold tabular-nums text-amber-800"
              />
            )}
            <button
              onClick={() =>
                go(async () => {
                  const res = await setTruckStatusBulk(date, [...selected], bulkStatus, bulkTime);
                  if (res.ok) setSelected(new Set());
                  return res;
                })
              }
              disabled={pending}
              className="rounded-full bg-brand-mid px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
            >
              Apply
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tap-to-place bar — shows while a driver is picked up. */}
      {pickedDriver && (
        <div className="print-hide fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-brand-mid bg-white py-2 pl-4 pr-2 shadow-lg">
            <span className="whitespace-nowrap text-sm text-slate-600">
              Moving <b className="text-brand-deep">{pickedDriver.name}</b> — tap a truck to place
            </span>
            <button
              onClick={() => setPicked(null)}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AvailBadge({ pct, on, total }: { pct: number; on: number; total: number }) {
  const cls =
    pct >= 0.9
      ? "text-brand-mid bg-brand-mid/10 border-brand-mid/30"
      : pct >= 0.8
        ? "text-amber-600 bg-amber-50 border-amber-300"
        : "text-rose-600 bg-rose-50 border-rose-300";
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold ${cls}`}>
      {on}/{total} · {Math.round(pct * 100)}%
    </span>
  );
}

const navBtn = "h-9 w-9 rounded-md border border-slate-300 bg-white text-lg text-slate-500 hover:bg-slate-50";

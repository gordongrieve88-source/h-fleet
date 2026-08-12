"use client";

import { useEffect, useRef, useState } from "react";
import type { TruckAssignmentVM, DriverVM } from "@/lib/fleet/catalog";
import { TRUCK_STATUS, TIMED_STATUS, statusKind, isOnRoad, parseTimeEntry } from "@/lib/wfm/fleet";
import { startVarianceMinutes } from "@/lib/wfm/analytics";
import { DriverChip } from "./DriverChip";

/** Observed departure, shown against the rostered time when both exist. */
function ActualStart({ rostered, actual }: { rostered: string | null; actual: string }) {
  const variance = startVarianceMinutes(rostered, actual);
  const late = variance !== null && variance > 5;
  return (
    <span
      className={`block text-[10px] tabular-nums ${late ? "font-semibold text-amber-600" : "text-slate-400"}`}
      title={
        variance === null
          ? `Actual departure ${actual}`
          : `Actual ${actual} · ${variance === 0 ? "on time" : `${variance > 0 ? "+" : ""}${variance} min`}`
      }
    >
      ▸{actual}
      {variance !== null && variance > 5 && <span className="ml-0.5">+{variance}</span>}
    </span>
  );
}

const DOT = { on: "bg-brand-mid", warn: "bg-amber-500", off: "bg-rose-500" } as const;
const SELECT_TEXT = { on: "text-brand-mid", warn: "text-amber-600", off: "text-rose-600" } as const;

/** One truck on the daily board: status dot · fleet code · driver · status.
 *  A drop target for dragged drivers, and — while a driver is picked up —
 *  a tap target for tap-to-place moves. */
export function TruckRow({
  row,
  awayTag,
  typeTag,
  driver,
  statusCodes,
  canEdit,
  onStatus,
  onStatusTime,
  onSetFto,
  homeBlock,
  depotBlocks,
  workBlock,
  onWorkDepot,
  onClearDriver,
  onDragStartDriver,
  onDropDriver,
  dragActive,
  onPickDriver,
  pickedDriver,
  placeActive,
  onPlace,
  actualStart,
  selected,
  onToggleSelect,
  acks,
}: {
  row: TruckAssignmentVM;
  /** Lent-out marker: "@ Camellia" at home, "from Greenacre" in the host card. */
  awayTag: { label: string; title: string } | null;
  /** Vehicle type shown as a small tag — null hides it (single-type fleets). */
  typeTag: string | null;
  driver: DriverVM | null;
  statusCodes: string[];
  canEdit: boolean;
  onStatus: (s: string) => void;
  /** Save the planned time behind a timed status (late start / early finish / service / dedag). */
  onStatusTime: (t: string) => void;
  /** Make this truck the plant's first truck out (dispatcher override). */
  onSetFto: () => void;
  /** The truck's home plant (block) — the depot picker's "home" option. */
  homeBlock: string;
  /** Other plants transport can send this truck to for the day. */
  depotBlocks: string[];
  /** Today's working plant when lent out — "" means home. */
  workBlock: string;
  /** Send the truck to work at another depot's plant for the day. */
  onWorkDepot: (block: string) => void;
  onClearDriver: () => void;
  onDragStartDriver: () => void;
  onDropDriver: () => void;
  dragActive: boolean;
  /** Tap this row's driver chip to pick it up (tap-to-place move). */
  onPickDriver: () => void;
  /** This row's driver is the one currently picked up. */
  pickedDriver: boolean;
  /** A driver is picked up somewhere — tapping this row places them here. */
  placeActive: boolean;
  onPlace: () => void;
  /** Observed departure from telematics, "HH:MM" — null when not fed. */
  actualStart: string | null;
  /** Bulk-select: ticked into the multi-truck status bar. */
  selected: boolean;
  onToggleSelect: () => void;
  /** Allocator acknowledgements from the RMX Portal — board changes actioned over there. */
  acks: { summary: string; by: string; at: string }[];
}) {
  const [over, setOver] = useState(false);
  // The planned-time field: local draft while typing, red hint when the text
  // doesn't parse. The draft clears once the server echoes the saved value.
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const [badTime, setBadTime] = useState(false);
  const timeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTime = (raw: string) => {
    if (timeTimer.current) clearTimeout(timeTimer.current);
    const parsed = raw.trim() === "" ? "" : parseTimeEntry(raw);
    if (parsed === null) {
      setBadTime(true);
      return;
    }
    setBadTime(false);
    setTimeDraft(parsed || null);
    if (parsed !== (row.statusTime ?? "")) onStatusTime(parsed);
  };
  // Switching windows must never lose a typed time — flush the draft the
  // moment the tab goes hidden (background timers can be frozen).
  const flushRef = useRef<() => void>(() => {});
  flushRef.current = () => {
    if (timeDraft != null && timeDraft !== (row.statusTime ?? "")) commitTime(timeDraft);
  };
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) flushRef.current();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);
  // A fresh server value (or a status flip) supersedes the local draft.
  const [timeSync, setTimeSync] = useState(`${row.status}|${row.statusTime ?? ""}`);
  if (timeSync !== `${row.status}|${row.statusTime ?? ""}`) {
    setTimeSync(`${row.status}|${row.statusTime ?? ""}`);
    setTimeDraft(null);
    setBadTime(false);
  }
  const kind = statusKind(row.status);
  const needsCover = !driver && row.status.toUpperCase() === "OFF-ND";
  const timedLabel = TIMED_STATUS[row.status.toUpperCase()] ?? null;

  return (
    <div
      onDragOver={(e) => {
        // Not preventing default = the row refuses the drop (out-of-scope rows).
        if (dragActive && canEdit) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={() => {
        setOver(false);
        if (canEdit) onDropDriver();
      }}
      onClick={(e) => {
        // While a driver is picked up, the whole row is a tap target — except
        // its own controls (status select, tick box, clear ×), which keep
        // their meaning.
        if (!placeActive || !canEdit) return;
        if ((e.target as HTMLElement).closest("select,button,input,label")) return;
        onPlace();
      }}
      className={`group grid items-center gap-2 rounded-lg border px-2 py-1.5 ${
        canEdit ? "grid-cols-[14px_10px_60px_1fr_auto_auto]" : "grid-cols-[10px_60px_1fr_auto_auto]"
      } ${
        needsCover
          ? "border-amber-300 bg-amber-50"
          : row.fto
            ? "border-brand-mid/70 bg-brand-mid/10 shadow-[inset_2.5px_0_0_0_#00843d]"
            : "border-slate-200 bg-white"
      } ${over ? "ring-2 ring-brand-mid" : ""} ${
        placeActive && !pickedDriver ? "cursor-pointer hover:ring-2 hover:ring-brand-mid" : ""
      }`}
    >
      {canEdit && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          title="Select for a bulk status change"
          className={`h-3 w-3 accent-[#00843d] ${selected ? "" : "opacity-30 transition-opacity focus:opacity-100 group-hover:opacity-100"}`}
        />
      )}
      <span
        title={TRUCK_STATUS[row.status as keyof typeof TRUCK_STATUS]?.label ?? row.status}
        className={`h-2.5 w-2.5 rounded-full ${DOT[kind]}`}
      />
      <span className="font-mono text-[12px] font-semibold text-slate-500">
        <span className={row.fto ? "text-brand-deep" : ""}>{row.truck}</span>
        {/* Stacked under the code — the column is only 60px, and anything
            inline here runs into the driver's name. */}
        {row.fto ? (
          <span
            className="mt-0.5 block w-fit rounded bg-brand-mid px-1 py-px font-sans text-[8.5px] font-bold tracking-wide text-white"
            title="First truck out — leads the plant today; the cycle follows on from here"
          >
            FTO
          </span>
        ) : (
          canEdit &&
          isOnRoad(row.status) &&
          // Not while visiting another plant — FTO turns belong at home.
          !awayTag?.label.startsWith("from ") && (
            <button
              onClick={onSetFto}
              className="mt-0.5 block w-fit rounded border border-brand-mid/40 px-1 py-px font-sans text-[8.5px] font-bold tracking-wide text-brand-mid opacity-0 transition-opacity hover:bg-brand-mid hover:text-white focus:opacity-100 group-hover:opacity-100"
              title="Make this the first truck out — overrides the cycle for today; tomorrow follows on from here"
            >
              →FTO
            </button>
          )
        )}
        {acks.length > 0 && (
          <span
            className="mt-0.5 block w-fit rounded bg-emerald-100 px-1 py-px font-sans text-[8.5px] font-bold tracking-wide text-emerald-700"
            title={acks
              .map((k) => `${k.summary} — actioned by ${k.by}, ${new Date(k.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`)
              .join("\n")}
          >
            ✓ ALLOC{acks.length > 1 ? ` ×${acks.length}` : ""}
          </span>
        )}
        {typeTag && <span className="mt-0.5 block font-sans text-[9px] font-medium uppercase tracking-wide text-slate-400">{typeTag}</span>}
        {awayTag && (
          <span className="mt-0.5 block font-sans text-[9px] font-semibold uppercase tracking-wide text-violet-600" title={awayTag.title}>
            {awayTag.label}
          </span>
        )}
      </span>

      <div className="min-w-0">
        {driver ? (
          <DriverChip
            driver={driver}
            draggable={canEdit}
            compact
            onDragStart={onDragStartDriver}
            // While placing, a tap on the chip means "place here" (swap) — let
            // it bubble to the row instead of re-picking.
            onPick={canEdit && !placeActive ? onPickDriver : undefined}
            picked={pickedDriver}
            onClear={canEdit ? onClearDriver : undefined}
          />
        ) : (
          <span className={`inline-flex items-center gap-1 text-[12px] italic ${needsCover ? "text-amber-700" : "text-slate-400"}`}>
            {needsCover ? "⚠ needs cover" : canEdit ? (placeActive ? "tap to place…" : "drop a driver…") : "—"}
          </span>
        )}
      </div>

      {/* Rostered start (Syncrotess import) with the telematics actual under
          it when we have one — late departures in amber. */}
      <span className="w-14 text-right leading-tight">
        <span className="block text-[10.5px] tabular-nums text-slate-400" title={row.time ? `Rostered ${row.time}` : ""}>
          {row.time || ""}
        </span>
        {actualStart && <ActualStart rostered={row.time} actual={actualStart} />}
      </span>

      {canEdit ? (
        <span className="flex flex-col items-end gap-0.5">
          <select
            value={row.status}
            onChange={(e) => onStatus(e.target.value)}
            title="Truck status"
            className={`max-w-[92px] rounded-md border border-slate-200 bg-white px-1 py-0.5 text-[10.5px] font-bold ${SELECT_TEXT[kind]}`}
          >
            {/* A historical code no longer on the menu (e.g. ON-FTO) stays
                selectable-as-is so old days render truthfully. */}
            {!statusCodes.includes(row.status) && (
              <option value={row.status} className="text-slate-400">
                {row.status}
              </option>
            )}
            {statusCodes.map((c) => (
              <option key={c} value={c} className="text-slate-700">
                {c}
              </option>
            ))}
          </select>
          {timedLabel && (
            <>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder="e.g. 1430"
                value={timeDraft ?? row.statusTime ?? ""}
                title={`${timedLabel} — 24-hour, type 1430 or 14:30${row.statusTime ? "" : ". Red until the time is saved."}`}
                // Plain 24-hour text — no AM/PM segment to forget (a native
                // time field in 12-hour locales silently holds NO value until
                // AM/PM is picked, which lost morning late starts). Saves on
                // a short pause, Enter, blur, or the tab being switched away.
                onChange={(e) => {
                  const v = e.target.value;
                  setTimeDraft(v);
                  setBadTime(false);
                  if (timeTimer.current) clearTimeout(timeTimer.current);
                  timeTimer.current = setTimeout(() => commitTime(v), 900);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTime(e.currentTarget.value);
                }}
                onBlur={(e) => commitTime(e.target.value)}
                className={`w-[92px] rounded-md border px-1 py-0.5 text-[10.5px] font-semibold tabular-nums focus:outline-none ${
                  row.statusTime
                    ? "border-amber-300 bg-amber-50 text-amber-800 focus:border-brand-mid"
                    : "border-rose-400 bg-rose-50 text-rose-700 focus:border-rose-500"
                }`}
              />
              {badTime && (
                <span className="text-[9px] font-bold text-rose-600" title="Type a 24-hour time like 1430 or 14:30.">
                  ⚠ can&apos;t read that time
                </span>
              )}
            </>
          )}
          {/* Depot for the day — hidden until hover while at home, loud
              violet (matching the "from …" tag) while lent out. */}
          {depotBlocks.length > 0 && (
            <select
              value={workBlock}
              onChange={(e) => onWorkDepot(e.target.value)}
              title="Working from — send this truck to another depot's plant for the day; it snaps home tomorrow"
              className={`max-w-[92px] rounded-md border px-1 py-0.5 text-[10px] font-semibold ${
                workBlock
                  ? "border-violet-300 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-400 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
              }`}
            >
              <option value="">⌂ {homeBlock}</option>
              {depotBlocks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}
        </span>
      ) : (
        <span className="flex flex-col items-end px-1">
          <span className={`text-[10.5px] font-bold ${SELECT_TEXT[kind]}`}>{row.status}</span>
          {timedLabel && row.statusTime && (
            <span className="text-[10px] font-semibold tabular-nums text-amber-700" title={timedLabel}>
              {row.statusTime}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

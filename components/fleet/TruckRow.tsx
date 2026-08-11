"use client";

import { useState } from "react";
import type { TruckAssignmentVM, DriverVM } from "@/lib/fleet/catalog";
import { TRUCK_STATUS, TIMED_STATUS, statusKind, isOnRoad } from "@/lib/wfm/fleet";
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
  awayAt,
  typeTag,
  driver,
  statusCodes,
  canEdit,
  onStatus,
  onStatusTime,
  onSetFto,
  onClearDriver,
  onDragStartDriver,
  onDropDriver,
  dragActive,
  onPickDriver,
  pickedDriver,
  placeActive,
  onPlace,
  actualStart,
}: {
  row: TruckAssignmentVM;
  /** Plant the truck is lent to today (from the allocation import), or null at home. */
  awayAt: string | null;
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
}) {
  const [over, setOver] = useState(false);
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
        // its own controls (status select, clear ×), which keep their meaning.
        if (!placeActive || !canEdit) return;
        if ((e.target as HTMLElement).closest("select,button")) return;
        onPlace();
      }}
      className={`group grid grid-cols-[10px_60px_1fr_auto_auto] items-center gap-2 rounded-lg border px-2 py-1.5 ${
        needsCover
          ? "border-amber-300 bg-amber-50"
          : row.fto
            ? "border-brand-mid/70 bg-brand-mid/10 shadow-[inset_2.5px_0_0_0_#00843d]"
            : "border-slate-200 bg-white"
      } ${over ? "ring-2 ring-brand-mid" : ""} ${
        placeActive && !pickedDriver ? "cursor-pointer hover:ring-2 hover:ring-brand-mid" : ""
      }`}
    >
      <span
        title={TRUCK_STATUS[row.status as keyof typeof TRUCK_STATUS]?.label ?? row.status}
        className={`h-2.5 w-2.5 rounded-full ${DOT[kind]}`}
      />
      <span className="font-mono text-[12px] font-semibold text-slate-500">
        <span className={row.fto ? "text-brand-deep" : ""}>{row.truck}</span>
        {row.fto ? (
          <span
            className="ml-1 rounded bg-brand-mid px-1 py-px align-middle font-sans text-[8.5px] font-bold tracking-wide text-white"
            title="First truck out — leads the plant today; the cycle follows on from here"
          >
            FTO
          </span>
        ) : (
          canEdit &&
          isOnRoad(row.status) && (
            <button
              onClick={onSetFto}
              className="ml-1 rounded border border-brand-mid/40 px-1 py-px align-middle font-sans text-[8.5px] font-bold tracking-wide text-brand-mid opacity-0 transition-opacity hover:bg-brand-mid hover:text-white focus:opacity-100 group-hover:opacity-100"
              title="Make this the first truck out — overrides the cycle for today; tomorrow follows on from here"
            >
              →FTO
            </button>
          )
        )}
        {typeTag && <span className="mt-0.5 block font-sans text-[9px] font-medium uppercase tracking-wide text-slate-400">{typeTag}</span>}
        {awayAt && (
          <span className="mt-0.5 block font-sans text-[9px] font-semibold uppercase tracking-wide text-violet-600" title={`Working at ${awayAt} today`}>
            @ {awayAt}
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
            <input
              type="time"
              defaultValue={row.statusTime ?? ""}
              title={timedLabel}
              onBlur={(e) => {
                if (e.target.value !== (row.statusTime ?? "")) onStatusTime(e.target.value);
              }}
              className="w-[92px] rounded-md border border-amber-300 bg-amber-50 px-1 py-0.5 text-[10.5px] font-semibold tabular-nums text-amber-800 focus:border-brand-mid focus:outline-none"
            />
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

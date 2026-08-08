"use client";

import { useState } from "react";
import type { TruckAssignmentVM, DriverVM } from "@/lib/fleet/catalog";
import { TRUCK_STATUS, statusKind } from "@/lib/wfm/fleet";
import { DriverChip } from "./DriverChip";

const DOT = { on: "bg-brand-mid", warn: "bg-amber-500", off: "bg-rose-500" } as const;
const SELECT_TEXT = { on: "text-brand-mid", warn: "text-amber-600", off: "text-rose-600" } as const;

/** One truck on the daily board: status dot · fleet code · driver · status.
 *  A drop target for dragged drivers, and — while a driver is picked up —
 *  a tap target for tap-to-place moves. */
export function TruckRow({
  row,
  typeTag,
  driver,
  statusCodes,
  canEdit,
  onStatus,
  onClearDriver,
  onDragStartDriver,
  onDropDriver,
  dragActive,
  onPickDriver,
  pickedDriver,
  placeActive,
  onPlace,
}: {
  row: TruckAssignmentVM;
  /** Vehicle type shown as a small tag — null hides it (single-type fleets). */
  typeTag: string | null;
  driver: DriverVM | null;
  statusCodes: string[];
  canEdit: boolean;
  onStatus: (s: string) => void;
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
}) {
  const [over, setOver] = useState(false);
  const kind = statusKind(row.status);
  const needsCover = !driver && row.status.toUpperCase() === "OFF-ND";

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
      className={`grid grid-cols-[10px_60px_1fr_auto_auto] items-center gap-2 rounded-lg border px-2 py-1.5 ${
        needsCover ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
      } ${over ? "ring-2 ring-brand-mid" : ""} ${
        placeActive && !pickedDriver ? "cursor-pointer hover:ring-2 hover:ring-brand-mid" : ""
      }`}
    >
      <span
        title={TRUCK_STATUS[row.status as keyof typeof TRUCK_STATUS]?.label ?? row.status}
        className={`h-2.5 w-2.5 rounded-full ${DOT[kind]}`}
      />
      <span className="font-mono text-[12px] font-semibold text-slate-500">
        {row.truck}
        {typeTag && <span className="mt-0.5 block font-sans text-[9px] font-medium uppercase tracking-wide text-slate-400">{typeTag}</span>}
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

      {/* Start time — set by the Syncrotess import (blank until one runs). */}
      <span className="w-10 text-right text-[10.5px] tabular-nums text-slate-400" title={row.time ? `Start ${row.time}` : ""}>
        {row.time || ""}
      </span>

      {canEdit ? (
        <select
          value={row.status}
          onChange={(e) => onStatus(e.target.value)}
          title="Truck status"
          className={`max-w-[92px] rounded-md border border-slate-200 bg-white px-1 py-0.5 text-[10.5px] font-bold ${SELECT_TEXT[kind]}`}
        >
          {statusCodes.map((c) => (
            <option key={c} value={c} className="text-slate-700">
              {c}
            </option>
          ))}
        </select>
      ) : (
        <span className={`px-1 text-[10.5px] font-bold ${SELECT_TEXT[kind]}`}>{row.status}</span>
      )}
    </div>
  );
}

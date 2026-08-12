"use client";

import { useState } from "react";
import type { DriverVM } from "@/lib/fleet/catalog";

function initials(name: string): string {
  const parts = name.replace(/\(.*?\)/g, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * A driver name chip — the unit of work on the fleet board. Moves two ways:
 * mouse drag (desktop) or tap-to-pick / tap-to-place (touch screens, where
 * HTML5 drag events never fire; also works as click-click with a mouse).
 */
export function DriverChip({
  driver,
  draggable,
  onDragStart,
  onPick,
  picked,
  onClear,
  compact,
}: {
  driver: DriverVM;
  draggable?: boolean;
  onDragStart?: () => void;
  /** Tap/click/Enter picks the driver up for a tap-to-place move. */
  onPick?: () => void;
  /** This chip is the one currently picked up. */
  picked?: boolean;
  onClear?: () => void;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(driver.id));
        setDragging(true);
        onDragStart?.();
      }}
      onDragEnd={() => setDragging(false)}
      onClick={
        onPick
          ? (e) => {
              e.stopPropagation();
              onPick();
            }
          : undefined
      }
      onKeyDown={
        onPick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick();
              }
            }
          : undefined
      }
      role={onPick ? "button" : undefined}
      tabIndex={onPick ? 0 : undefined}
      className={`flex min-w-0 items-center gap-2 rounded-md border bg-white ${
        compact ? "px-1.5 py-0.5" : "px-2 py-1"
      } ${draggable ? "cursor-grab hover:border-brand-mid/50" : onPick ? "cursor-pointer hover:border-brand-mid/50" : ""} ${
        picked ? "border-brand-mid ring-2 ring-brand-mid/40" : "border-slate-200"
      } ${dragging ? "opacity-50" : ""}`}
      title={`${driver.name} · ${driver.employeeNo} · ${driver.workgroup}`}
    >
      <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded bg-brand-mid text-[9px] font-bold text-white">
        {initials(driver.name)}
      </span>
      <span className="truncate text-[12.5px] text-slate-700">{driver.name}</span>
      {onClear && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          title="Remove driver"
          className="ml-auto px-0.5 text-slate-400 hover:text-rose-600"
        >
          ×
        </button>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { DriverVM } from "@/lib/fleet/catalog";

function initials(name: string): string {
  const parts = name.replace(/\(.*?\)/g, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** A draggable driver name chip — the unit of work on the fleet board. */
export function DriverChip({
  driver,
  draggable,
  onDragStart,
  onClear,
  compact,
}: {
  driver: DriverVM;
  draggable?: boolean;
  onDragStart?: () => void;
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
      className={`flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white ${
        compact ? "px-1.5 py-0.5" : "px-2 py-1"
      } ${draggable ? "cursor-grab hover:border-brand-mid/50" : ""} ${dragging ? "opacity-50" : ""}`}
      title={`${driver.name} · ${driver.employeeNo} · ${driver.workgroup}`}
    >
      <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded bg-brand-mid text-[9px] font-bold text-white">
        {initials(driver.name)}
      </span>
      <span className="truncate text-[12.5px] text-slate-700">{driver.name}</span>
      {onClear && (
        <button onClick={onClear} title="Remove driver" className="ml-auto px-0.5 text-slate-400 hover:text-rose-600">
          ×
        </button>
      )}
    </div>
  );
}

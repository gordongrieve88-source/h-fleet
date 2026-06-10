"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { decideDriverLeave, approveAllPendingDriverLeave } from "./actions";

export type CoverageImpact = {
  riskyDays: { dateLabel: string; before: number; after: number; target: number }[];
  severity: "ok" | "warn" | "critical";
};

function useDecide() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  function run(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast(res.error ?? "Something went wrong.", "error");
      else {
        toast(msg);
        router.refresh();
      }
    });
  }
  return { pending, run };
}

const btnApprove = "rounded-md bg-brand-mid px-3 py-1 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-50";
const btnReject = "rounded-md border border-rose-300 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50";

export function DriverLeaveApprovalRow({
  id,
  driverName,
  depotName,
  typeCode,
  typeColor,
  dateLabel,
  notes,
  impact,
}: {
  id: number;
  driverName: string;
  depotName: string;
  typeCode: string;
  typeColor: string;
  dateLabel: string;
  notes: string | null;
  impact?: CoverageImpact;
}) {
  const { pending, run } = useDecide();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  return (
    <li className="px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-slate-700">
          <strong className="font-semibold">{driverName}</strong>
          <span className="ml-1.5 text-xs text-slate-400">{depotName}</span>
          <span className="ml-2 rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: typeColor + "22", color: typeColor }}>
            {typeCode}
          </span>
          <span className="ml-2 text-slate-600">{dateLabel}</span>
        </span>
        <span className="flex items-center gap-2">
          <button type="button" disabled={pending} onClick={() => run(() => decideDriverLeave(id, true, null), `${driverName}'s leave approved`)} className={btnApprove}>
            Approve
          </button>
          <button type="button" disabled={pending} onClick={() => setRejecting((r) => !r)} className={btnReject}>
            Reject…
          </button>
        </span>
      </div>
      {notes && <div className="mt-1 rounded-md border-l-2 border-slate-300 bg-slate-50 px-2 py-1 text-xs italic text-slate-600">“{notes}”</div>}
      {impact && impact.severity !== "ok" && (
        <div
          className={`mt-1.5 rounded-md px-2.5 py-1.5 text-xs ${
            impact.severity === "critical" ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
          }`}
        >
          {impact.severity === "critical" ? "⛔ Depot stretched if approved: " : "⚠ Tight at the depot if approved: "}
          {impact.riskyDays.slice(0, 3).map((r) => `${r.dateLabel} → ${r.after} off (flag at ${r.target})`).join(" · ")}
          {impact.riskyDays.length > 3 && ` · +${impact.riskyDays.length - 3} more`}
        </div>
      )}
      {rejecting && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={240}
            placeholder="Reason (recorded on the request)"
            className="min-w-64 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-brand-mid focus:outline-none"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => decideDriverLeave(id, false, note || null), "Request rejected")}
            className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            Confirm reject
          </button>
        </div>
      )}
    </li>
  );
}

export function BulkApproveButton({ count }: { count: number }) {
  const { pending, run } = useDecide();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Approve all ${count} driver leave requests? Each one is validated individually.`)) return;
        run(() => approveAllPendingDriverLeave(), "All driver leave requests approved");
      }}
      className="rounded-md border border-brand-mid px-2.5 py-1 text-xs font-medium text-brand-mid hover:bg-brand-mid hover:text-white disabled:opacity-50"
    >
      Approve all ({count})
    </button>
  );
}

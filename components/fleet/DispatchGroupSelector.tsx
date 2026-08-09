"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setViewGroup } from "@/lib/fleet/view-group-actions";
import type { DispatchGroupVM } from "@/lib/fleet/view-group";

/**
 * Which dispatch group the app is showing. Sits in the topbar because it is
 * whole-app context, like the date — every depot-derived screen follows it.
 */
export function DispatchGroupSelector({ groups, current }: { groups: DispatchGroupVM[]; current: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (groups.length === 0) return null;

  const change = (code: string) =>
    startTransition(async () => {
      await setViewGroup(code);
      router.refresh();
    });

  const only = groups.length === 1 ? groups[0] : null;

  // A single group is context, not a choice — show it, don't ask.
  if (only) {
    return (
      <span
        className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12.5px] text-slate-600 sm:inline-flex"
        title={`Dispatch group ${only.code} — ${only.name} · ${only.depots} depot${only.depots === 1 ? "" : "s"}`}
      >
        <span className="font-mono text-[11px] font-bold text-brand-mid">{only.code}</span>
        {only.name}
      </span>
    );
  }

  return (
    <label className="hidden items-center gap-1.5 sm:flex" title="Which dispatch group to show">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Group</span>
      <select
        value={current ?? "ALL"}
        disabled={pending}
        onChange={(e) => change(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12.5px] font-medium text-slate-700 focus:border-brand-mid focus:outline-none"
      >
        <option value="ALL">All groups ({groups.reduce((a, g) => a + g.depots, 0)} depots)</option>
        {groups.map((g) => (
          <option key={g.code} value={g.code}>
            {g.code} — {g.name} ({g.state})
          </option>
        ))}
      </select>
    </label>
  );
}

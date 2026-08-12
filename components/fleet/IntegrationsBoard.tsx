"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import {
  previewPeopleSync,
  applyPeopleSync,
  syncTelematics,
  type PeoplePreview,
  type TelematicsResult,
} from "@/app/(app)/integrations/actions";

export interface ConnectorVM {
  connector: "people" | "telematics";
  title: string;
  purpose: string;
  providerId: string | null;
  providerLabel: string | null;
  isSample: boolean;
  blockedReason: string | null;
  envVar: string;
  options: string[];
}

export interface RunVM {
  id: number;
  connector: string;
  provider: string;
  isSample: boolean;
  dryRun: boolean;
  status: string;
  summary: string;
  at: string;
}

/** Unmistakable marker wherever demonstration data is involved. */
function SampleBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ${className}`}>
      Sample data
    </span>
  );
}

export function IntegrationsBoard({
  connectors,
  runs,
  defaultDate,
}: {
  connectors: ConnectorVM[];
  runs: RunVM[];
  defaultDate: string;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<PeoplePreview | null>(null);
  const [teleDate, setTeleDate] = useState(defaultDate);
  const [teleResult, setTeleResult] = useState<TelematicsResult | null>(null);

  const people = connectors.find((c) => c.connector === "people")!;
  const tele = connectors.find((c) => c.connector === "telematics")!;
  const anySample = connectors.some((c) => c.isSample && !c.blockedReason);

  const run = <T,>(fn: () => Promise<T | { ok: false; error: string }>, onOk: (r: T) => void) =>
    startTransition(async () => {
      const res = await fn();
      if ((res as { ok: false; error: string }).ok === false) {
        toast((res as { ok: false; error: string }).error, "error");
        return;
      }
      onOk(res as T);
    });

  return (
    <div className={pending ? "opacity-70 transition-opacity" : ""}>
      {anySample && (
        <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <SampleBadge />
            <span className="text-sm font-semibold text-amber-900">A connector is running on demonstration data</span>
          </div>
          <p className="mt-1 text-[12.5px] text-amber-800">
            Figures produced by a sample provider are invented to show how the integration works. They are marked as
            sample in the run history and the audit trail, permanently. Point the connector at the real vendor before
            anyone makes a decision on this data.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* People connector */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <ConnectorHeader c={people} />
          {people.blockedReason ? (
            <Blocked reason={people.blockedReason} envVar={people.envVar} options={people.options} />
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => run(previewPeopleSync, (r: PeoplePreview) => { setPreview(r); toast("Preview ready — nothing changed yet."); })}
                  className="rounded-lg border border-brand-mid px-3 py-1.5 text-xs font-semibold text-brand-deep hover:bg-brand-mid/10"
                >
                  Preview changes
                </button>
                <button
                  onClick={() => {
                    if (!window.confirm("Apply this HR feed to driver records and entitlements?")) return;
                    run(applyPeopleSync, (r: PeoplePreview) => {
                      setPreview(r);
                      toast(`Synced — ${r.create.length} added, ${r.update.length} updated, ${r.deactivate.length} deactivated.`);
                    });
                  }}
                  className="rounded-lg bg-brand-mid px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep"
                >
                  Sync now
                </button>
              </div>
              {preview && <PeopleDiffView p={preview} />}
            </>
          )}
        </section>

        {/* Telematics connector */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <ConnectorHeader c={tele} />
          {tele.blockedReason ? (
            <Blocked reason={tele.blockedReason} envVar={tele.envVar} options={tele.options} />
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-xs text-slate-500">
                  Day
                  <input
                    type="date"
                    value={teleDate}
                    onChange={(e) => setTeleDate(e.target.value)}
                    className="block rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
                <button
                  onClick={() =>
                    run(
                      () => syncTelematics(teleDate),
                      (r: TelematicsResult) => {
                        setTeleResult(r);
                        toast(`Pulled ${r.stored} vehicle days for ${r.dateKey}.`);
                      },
                    )
                  }
                  className="rounded-lg bg-brand-mid px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep"
                >
                  Pull actuals
                </button>
              </div>
              {teleResult && (
                <p className="mt-3 rounded-lg bg-brand-mid/5 px-3 py-2 text-[12.5px] text-brand-deep">
                  <b>{teleResult.stored}</b> vehicle days stored for {teleResult.dateKey}
                  {teleResult.fetched !== teleResult.stored && (
                    <span className="text-slate-500"> ({teleResult.fetched - teleResult.stored} not in the fleet list)</span>
                  )}
                  . Start-time variance now shows on the board and in Fleet intelligence.
                </p>
              )}
            </>
          )}
        </section>
      </div>

      {/* Run history */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-card">
        <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-brand-deep">Recent runs</h2>
        {runs.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">Nothing has run yet.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-[12.5px]">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    r.status === "OK"
                      ? "bg-brand-mid/15 text-brand-deep"
                      : r.status === "PREVIEW"
                        ? "bg-slate-100 text-slate-500"
                        : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {r.dryRun ? "preview" : r.status}
                </span>
                {r.isSample && <SampleBadge />}
                <span className="text-slate-700">{r.summary}</span>
                <span className="ml-auto whitespace-nowrap text-[11px] text-slate-400">
                  {new Date(r.at).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ConnectorHeader({ c }: { c: ConnectorVM }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-brand-deep">{c.title}</h2>
        {c.isSample && !c.blockedReason && <SampleBadge />}
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            c.blockedReason ? "bg-slate-100 text-slate-500" : "bg-brand-mid/15 text-brand-deep"
          }`}
        >
          {c.blockedReason ? "not connected" : "connected"}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-slate-500">{c.purpose}</p>
      {c.providerLabel && <p className="mt-1 text-[11px] text-slate-400">Provider: {c.providerLabel}</p>}
    </div>
  );
}

function Blocked({ reason, envVar, options }: { reason: string; envVar: string; options: string[] }) {
  return (
    <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
      <p className="text-[12.5px] text-slate-600">{reason}</p>
      <p className="mt-1 font-mono text-[11px] text-slate-400">
        {envVar}={options.join(" | ")}
      </p>
    </div>
  );
}

function DiffCount({ label, n, tone }: { label: string; n: number; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-200 px-2.5 py-1.5">
      <div className={`text-lg font-bold tabular-nums ${tone}`}>{n}</div>
      <div className="text-[10.5px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

function PeopleDiffView({ p }: { p: PeoplePreview }) {
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="grid grid-cols-4 gap-2">
        <DiffCount label="New" n={p.create.length} tone="text-brand-deep" />
        <DiffCount label="Changed" n={p.update.length} tone="text-amber-600" />
        <DiffCount label="Leaving" n={p.deactivate.length} tone="text-rose-600" />
        <DiffCount label="Balances" n={p.balances.toUpsert} tone="text-slate-600" />
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        {p.fetched} records read · {p.unchanged} unchanged · {p.unmatchedCount} in H-Fleet but absent from the feed
        (reported, never touched)
      </p>
      {p.update.length > 0 && (
        <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-[12px]">
          {p.update.slice(0, 25).map((u) => (
            <li key={u.employeeNo} className="text-slate-600">
              <b className="font-medium text-slate-700">{u.name}</b> — {u.changes.join("; ")}
            </li>
          ))}
        </ul>
      )}
      {p.deactivate.length > 0 && (
        <p className="mt-2 text-[12px] text-rose-700">
          Leaving: {p.deactivate.slice(0, 8).map((d) => d.name).join(", ")}
          {p.deactivate.length > 8 && ` +${p.deactivate.length - 8} more`}
        </p>
      )}
      {p.create.some((c) => !c.resolvable) && (
        <p className="mt-2 text-[12px] text-amber-700">
          Some new starters name a depot H-Fleet doesn&apos;t have — those rows are skipped until the depot exists.
        </p>
      )}
    </div>
  );
}

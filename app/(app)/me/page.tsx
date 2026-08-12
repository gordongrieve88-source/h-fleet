import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { selfServiceRepo, driverLeaveRepo } from "@/lib/db/repositories";
import { credentialState, daysUntil } from "@/lib/wfm/compliance";
import { addDaysUTC, fmtDate, fmtDayShort, todayUTC, ymd } from "@/lib/wfm/date";
import { statusLabel, isOnRoad, awayPlant } from "@/lib/wfm/fleet";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

/**
 * "My roster" — the driver-facing self-service page. Deliberately simple and
 * mobile-first: what truck am I on, what time do I start, where am I working,
 * what leave do I have, and are any of my tickets about to expire. Read-only.
 */
export default async function MyRosterPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const driver = await selfServiceRepo.driverForUser(user.id);
  if (!driver) {
    return (
      <div className="space-y-4">
        <PageHeader title="My roster" description="Your personal roster, leave and licence expiries." />
        <EmptyState
          title="No driver linked to this account"
          hint="A supervisor can link your sign-in to your driver record on the Drivers screen — then your roster shows up here."
        />
      </div>
    );
  }

  const today = todayUTC();
  const todayKey = ymd(today);
  const [days, leave, credentials, balances] = await Promise.all([
    selfServiceRepo.myDays(driver.id, today, addDaysUTC(today, 13)),
    selfServiceRepo.myLeave(driver.id, today),
    selfServiceRepo.myCredentials(driver.id),
    driverLeaveRepo.alBalances(today.getUTCFullYear()),
  ]);

  const todayRow = days[0];
  const bal = balances[driver.id];
  const alLeft = bal ? Math.max(0, bal.entitled - bal.taken) : null;
  const away = todayRow ? awayPlant(todayRow.workLocation, driver.depot.name) : null;
  const expiring = credentials
    .map((c) => ({ c, state: credentialState(c.expiresOn, today, c.type.warnDays) }))
    .filter((x) => x.state === "expired" || x.state === "expiring");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="My roster" description={`${driver.name} · ${driver.depot.name} · #${driver.employeeNo}`} />

      {/* Today — the one thing a driver opens this page for. */}
      <section className="rounded-2xl border border-brand-mid/30 bg-white p-4 shadow-card">
        <div className="text-[11px] font-bold uppercase tracking-wide text-brand-mid">Today · {fmtDate(today)}</div>
        {todayRow?.leaveCode ? (
          <div className="mt-1.5 text-2xl font-semibold text-brand-deep">
            On leave <span className="text-base font-medium text-slate-400">({todayRow.leaveCode})</span>
          </div>
        ) : todayRow?.truck ? (
          <>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-3xl font-bold tracking-tight text-brand-deep">{todayRow.truck}</span>
              {todayRow.time && <span className="text-2xl font-semibold tabular-nums text-slate-700">{todayRow.time}</span>}
              {todayRow.status && !isOnRoad(todayRow.status) && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">{statusLabel(todayRow.status)}</span>
              )}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {away ? (
                <span className="font-semibold text-violet-600">
                  Working at {away} today (not {driver.depot.name})
                </span>
              ) : (
                driver.depot.name
              )}
              {!todayRow.time && <span className="ml-1.5 text-slate-400">· start time not published yet</span>}
            </div>
          </>
        ) : (
          <div className="mt-1.5 text-2xl font-semibold text-slate-400">Not rostered</div>
        )}
        {!todayRow?.captured && !todayRow?.leaveCode && (
          <p className="mt-2 text-[11px] text-slate-400">
            Provisional — today&apos;s board hasn&apos;t been finalised yet. Check back after your supervisor publishes it.
          </p>
        )}
      </section>

      {/* Next two weeks */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card">
        <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-brand-deep">Next two weeks</h2>
        <ul className="divide-y divide-slate-50">
          {days.slice(1).map((d) => (
            <li key={d.dateKey} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className={`w-24 shrink-0 ${d.dateKey === todayKey ? "font-semibold text-brand-mid" : "text-slate-500"}`}>
                {fmtDayShort(new Date(`${d.dateKey}T00:00:00Z`))}
              </span>
              {d.leaveCode ? (
                <span className="font-medium text-amber-700">On leave · {d.leaveCode}</span>
              ) : d.truck ? (
                <>
                  <span className="font-mono font-semibold text-slate-700">{d.truck}</span>
                  {d.time && <span className="tabular-nums text-slate-600">{d.time}</span>}
                  {awayPlant(d.workLocation, driver.depot.name) && (
                    <span className="text-xs font-semibold text-violet-600">@ {awayPlant(d.workLocation, driver.depot.name)}</span>
                  )}
                  {!d.captured && <span className="ml-auto text-[10px] uppercase text-slate-300">provisional</span>}
                </>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Leave */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-baseline justify-between border-b border-slate-100 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-brand-deep">My leave</h2>
          {alLeft !== null && (
            <span className="text-xs text-slate-500">
              AL remaining <b className="text-brand-deep">{alLeft.toFixed(1)}</b> days
            </span>
          )}
        </div>
        {leave.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">No upcoming leave booked.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {leave.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="w-11 shrink-0 font-semibold" style={{ color: l.leaveType.colorHex ?? "#475569" }}>
                  {l.leaveTypeCode}
                </span>
                <span className="text-slate-700">
                  {fmtDate(l.startDate)}
                  {l.startDate.getTime() !== l.endDate.getTime() && ` – ${fmtDate(l.endDate)}`}
                </span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    l.status === "APPROVED"
                      ? "bg-brand-mid/10 text-brand-deep"
                      : l.status === "PENDING"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {l.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
          Balances are roster figures only — Workday remains the source of truth for pay and formal leave applications.
        </p>
      </section>

      {/* Tickets */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card">
        <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-brand-deep">My tickets &amp; medicals</h2>
        {credentials.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {credentials.map((c) => {
              const state = credentialState(c.expiresOn, today, c.type.warnDays);
              const days = c.expiresOn ? daysUntil(c.expiresOn, today) : null;
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="text-slate-700">{c.type.name}</span>
                  <span
                    className={`ml-auto whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      state === "expired"
                        ? "border-rose-300 bg-rose-50 text-rose-700"
                        : state === "expiring"
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-brand-mid/30 bg-brand-mid/10 text-brand-deep"
                    }`}
                  >
                    {c.expiresOn === null
                      ? "no expiry"
                      : state === "expired"
                        ? `expired ${fmtDate(c.expiresOn)}`
                        : days === 0
                          ? "expires today"
                          : `${days}d left`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {expiring.length > 0 && (
          <p className="border-t border-slate-100 px-4 py-2 text-[11px] font-medium text-amber-700">
            Renew these with your supervisor — an expired licence stops you being rostered.
          </p>
        )}
      </section>

      <p className="pb-2 text-center text-xs text-slate-400">
        Something wrong? Talk to your supervisor — or see the{" "}
        <Link href="/fleet" className="underline">
          full fleet board
        </Link>
        .
      </p>
    </div>
  );
}

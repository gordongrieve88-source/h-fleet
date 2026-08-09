import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isManagerRole } from "@/lib/auth/roles";
import { referenceRepo, complianceRepo, fleetRepo } from "@/lib/db/repositories";
import { PageHeader, Card } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { StatesPicker } from "@/components/StatesPicker";
import { todayUTC, ymd } from "@/lib/wfm/date";
import {
  createLeaveTypeAction,
  updateLeaveTypeAction,
  toggleLeaveTypeActive,
  createCredentialTypeAction,
  updateCredentialTypeAction,
  toggleCredentialTypeActive,
  deleteCredentialTypeAction,
  createHolidayAction,
  deleteHolidayAction,
  createDispatchGroupAction,
  updateDispatchGroupAction,
  toggleDispatchGroupActive,
  deleteDispatchGroupAction,
} from "./actions";

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-brand-mid focus:outline-none focus:ring-1 focus:ring-brand-mid";
const saveBtn = "rounded-lg bg-brand-mid px-3 py-1 text-xs font-semibold text-white hover:bg-brand-deep";
const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

export default async function SetupPage() {
  const user = await getCurrentUser();
  if (!isManagerRole(user?.role)) redirect("/fleet");

  const [leaveTypes, holidays, credentialTypes, truckTypes, groups] = await Promise.all([
    referenceRepo.listAllLeaveTypes(),
    referenceRepo.listAllHolidays(),
    complianceRepo.listAllTypes(),
    complianceRepo.truckTypes(),
    fleetRepo.listAllDispatchGroups(),
  ]);
  const categories = [...new Set(credentialTypes.map((c) => c.category))];
  const todayKey = ymd(todayUTC());
  const upcomingHolidays = holidays.filter((h) => h.date >= todayKey);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Setup"
        description="Dispatch groups, leave types, credentials and public holidays. Changes here flow straight through to the board, planner and reports — nothing is hardcoded."
      />

      {/* Dispatch groups */}
      <Card title="Dispatch groups" count={groups.length}>
        <ul className="divide-y divide-slate-50">
          {groups.map((g) => (
            <li key={g.code} className={`px-4 py-1.5 ${g.isActive ? "" : "opacity-50"}`}>
              <form action={updateDispatchGroupAction} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="code" value={g.code} />
                <span className="w-12 font-mono font-semibold text-brand-mid">{g.code}</span>
                <input name="name" defaultValue={g.name} className={`${inputCls} min-w-48 flex-1`} />
                <select name="state" defaultValue={g.state} className={inputCls} title="Where the group operates">
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input name="sortOrder" type="number" defaultValue={g.sortOrder} className={`${inputCls} w-16`} title="Sort order" />
                <SubmitButton className={saveBtn} savedToast={`${g.code} saved`}>
                  Save
                </SubmitButton>
              </form>
              <div className="mt-0.5 flex items-center gap-3">
                <form action={toggleDispatchGroupActive}>
                  <input type="hidden" name="code" value={g.code} />
                  <input type="hidden" name="active" value={g.isActive ? "false" : "true"} />
                  <SubmitButton
                    className="text-[11px] text-slate-400 hover:text-slate-600 hover:underline"
                    savedToast={g.isActive ? `${g.code} hidden — depots keep their group` : `${g.code} reactivated`}
                  >
                    {g.isActive ? "Hide" : "Reactivate"}
                  </SubmitButton>
                </form>
                {g._count.depots === 0 ? (
                  <form action={deleteDispatchGroupAction}>
                    <input type="hidden" name="code" value={g.code} />
                    <SubmitButton
                      className="text-[11px] text-rose-600 hover:underline"
                      savedToast={`${g.code} removed`}
                      confirmMessage={`Remove dispatch group ${g.code} (${g.name})? No depots use it, so nothing else is affected.`}
                    >
                      Remove
                    </SubmitButton>
                  </form>
                ) : (
                  <span className="text-[11px] text-slate-300" title="Move its depots to another group before removing it">
                    in use — can&apos;t remove
                  </span>
                )}
                <span className="text-[11px] text-slate-400">
                  {g._count.depots > 0 ? `${g._count.depots} depot${g._count.depots === 1 ? "" : "s"}` : "no depots yet"}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <form action={createDispatchGroupAction} className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          ＋ Add group
          <input name="code" placeholder="e.g. 305" className={`${inputCls} w-24 font-mono`} />
          <input name="name" placeholder="Display name, e.g. TAS Conc" className={`${inputCls} min-w-48 flex-1`} />
          <select name="state" defaultValue="NSW" className={inputCls}>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input name="sortOrder" type="number" defaultValue={50} className={`${inputCls} w-16`} />
          <SubmitButton className={saveBtn} savedToast="Dispatch group added">
            Add
          </SubmitButton>
        </form>
        <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
          The allocation system&apos;s grouping, and what the view selector in the top bar switches between. Assign depots
          to a group on <b>Fleet → Depots</b>; a group with no depots stays out of the selector until it has some. The code
          is the identity Syncrotess prints, so it can&apos;t be edited — add the right one and move the depots across.
          Hiding a group keeps its depots attached; removing one is only offered while nothing uses it.
        </p>
      </Card>

      {/* Leave types */}
      <Card title="Leave types" count={leaveTypes.length}>
        <ul className="divide-y divide-slate-50">
          {leaveTypes.map((lt) => (
            <li key={lt.code} className={`px-4 py-1.5 ${lt.isActive ? "" : "opacity-50"}`}>
              <form action={updateLeaveTypeAction} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="code" value={lt.code} />
                <span className="w-16 font-semibold" style={{ color: lt.colorHex ?? "#475569" }}>
                  {lt.code}
                </span>
                <input name="name" defaultValue={lt.name} className={`${inputCls} min-w-56 flex-1`} />
                <input name="colorHex" type="color" defaultValue={lt.colorHex ?? "#475569"} className="h-7 w-10 cursor-pointer rounded border border-slate-300" title="Colour" />
                <input name="sortOrder" type="number" defaultValue={lt.sortOrder} className={`${inputCls} w-16`} title="Sort order" />
                <SubmitButton className={saveBtn} savedToast={`${lt.code} saved`}>
                  Save
                </SubmitButton>
              </form>
              <form action={toggleLeaveTypeActive} className="mt-0.5">
                <input type="hidden" name="code" value={lt.code} />
                <input type="hidden" name="active" value={lt.isActive ? "false" : "true"} />
                <SubmitButton className="text-[11px] text-slate-400 hover:text-slate-600 hover:underline" savedToast={lt.isActive ? `${lt.code} hidden from new requests` : `${lt.code} reactivated`}>
                  {lt.isActive ? "Hide from new requests" : "Reactivate"}
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
        <form action={createLeaveTypeAction} className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          ＋ Add type
          <input name="code" placeholder="CODE" className={`${inputCls} w-20 uppercase`} />
          <input name="name" placeholder="Display name" className={`${inputCls} min-w-56 flex-1`} />
          <input name="colorHex" type="color" defaultValue="#0d9488" className="h-7 w-10 cursor-pointer rounded border border-slate-300" />
          <input name="sortOrder" type="number" defaultValue={50} className={`${inputCls} w-16`} />
          <SubmitButton className={saveBtn} savedToast="Leave type added">
            Add
          </SubmitButton>
        </form>
      </Card>

      {/* Driver credential types */}
      <Card title="Driver credentials & competencies" count={credentialTypes.length}>
        <ul className="divide-y divide-slate-50">
          {credentialTypes.map((ct) => (
            <li key={ct.code} className={`px-4 py-1.5 ${ct.isActive ? "" : "opacity-50"}`}>
              <form action={updateCredentialTypeAction} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="code" value={ct.code} />
                <span className="w-16 font-semibold text-slate-600">{ct.code}</span>
                <input name="name" defaultValue={ct.name} className={`${inputCls} min-w-48 flex-1`} />
                <select name="kind" defaultValue={ct.kind} className={inputCls} title="Dated ticket, or a tick box they either hold or don't">
                  <option value="EXPIRY">Dated ticket</option>
                  <option value="TICKBOX">Tick box</option>
                </select>
                <input name="category" defaultValue={ct.category} list="cred-categories" className={`${inputCls} w-36`} title="Grouping on the driver profile" />
                <StatesPicker name="states" defaultValue={ct.states} />
                <select name="requiredForTruckType" defaultValue={ct.requiredForTruckType ?? ""} className={inputCls} title="Tick boxes only: required to drive this truck type">
                  <option value="">Any truck</option>
                  {truckTypes.map((t) => (
                    <option key={t} value={t}>
                      Needed for {t}
                    </option>
                  ))}
                </select>
                <select name="severity" defaultValue={ct.severity} className={inputCls} title="What an expired ticket does">
                  <option value="WARN">Warn only</option>
                  <option value="BLOCK">Block rostering</option>
                </select>
                <label className="flex items-center gap-1 text-xs text-slate-500">
                  warn
                  <input name="warnDays" type="number" defaultValue={ct.warnDays} className={`${inputCls} w-16`} title="Expiring-soon window (days)" />
                  d
                </label>
                <input name="sortOrder" type="number" defaultValue={ct.sortOrder} className={`${inputCls} w-14`} title="Sort order" />
                <SubmitButton className={saveBtn} savedToast={`${ct.code} saved`}>
                  Save
                </SubmitButton>
              </form>
              <div className="mt-0.5 flex items-center gap-3">
                <form action={toggleCredentialTypeActive}>
                  <input type="hidden" name="code" value={ct.code} />
                  <input type="hidden" name="active" value={ct.isActive ? "false" : "true"} />
                  <SubmitButton
                    className="text-[11px] text-slate-400 hover:text-slate-600 hover:underline"
                    savedToast={ct.isActive ? `${ct.code} hidden — records kept` : `${ct.code} reactivated`}
                  >
                    {ct.isActive ? "Hide" : "Reactivate"}
                  </SubmitButton>
                </form>
                <form action={deleteCredentialTypeAction}>
                  <input type="hidden" name="code" value={ct.code} />
                  <SubmitButton
                    className="text-[11px] text-rose-600 hover:underline"
                    savedToast={`${ct.code} removed`}
                    confirmMessage={
                      ct._count.credentials > 0
                        ? `Remove "${ct.name}" entirely?\n\n${ct._count.credentials} driver record${ct._count.credentials === 1 ? "" : "s"} will be deleted with it. This can't be undone — use Hide instead to retire it and keep the history.`
                        : `Remove "${ct.name}"? No drivers hold it, so nothing else is affected.`
                    }
                  >
                    Remove
                  </SubmitButton>
                </form>
                <span className="text-[11px] text-slate-300">
                  {ct._count.credentials > 0
                    ? `${ct._count.credentials} driver${ct._count.credentials === 1 ? "" : "s"}`
                    : "unused"}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <datalist id="cred-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <form action={createCredentialTypeAction} className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          ＋ Add
          <input name="code" placeholder="CODE" className={`${inputCls} w-20 uppercase`} />
          <input name="name" placeholder="Display name" className={`${inputCls} min-w-48 flex-1`} />
          <select name="kind" defaultValue="TICKBOX" className={inputCls}>
            <option value="TICKBOX">Tick box</option>
            <option value="EXPIRY">Dated ticket</option>
          </select>
          <input name="category" placeholder="Group, e.g. Mixes" list="cred-categories" className={`${inputCls} w-36`} />
          <StatesPicker name="states" />
          <select name="requiredForTruckType" defaultValue="" className={inputCls}>
            <option value="">Any truck</option>
            {truckTypes.map((t) => (
              <option key={t} value={t}>
                Needed for {t}
              </option>
            ))}
          </select>
          <select name="severity" defaultValue="WARN" className={inputCls}>
            <option value="WARN">Warn only</option>
            <option value="BLOCK">Block rostering</option>
          </select>
          <input name="warnDays" type="number" defaultValue={30} className={`${inputCls} w-16`} title="Expiring-soon window (days)" />
          <input name="sortOrder" type="number" defaultValue={50} className={`${inputCls} w-14`} />
          <SubmitButton className={saveBtn} savedToast="Added">
            Add
          </SubmitButton>
        </form>
        <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
          <p className="mb-1">
            <b>Tick box</b> — a competency a driver either holds or doesn&apos;t: trained on a mix, signed off on a truck
            type, inducted to a site. Ticked on the driver&apos;s own profile. <b>Dated ticket</b> — a licence or medical
            with an expiry, maintained on the Compliance screen.
          </p>
          <p>
            Set <b>Needed for &lt;truck type&gt;</b> on a tick box and a driver who doesn&apos;t hold it can&apos;t be
            rostered onto that kind of truck. An expired <b>Block rostering</b> ticket does the same. Everything else
            flags in the Fleet doctor.
          </p>
        </div>
      </Card>

      {/* Public holidays */}
      <Card title="Public holidays" count={`${upcomingHolidays.length} upcoming`}>
        <ul className="max-h-80 divide-y divide-slate-50 overflow-y-auto">
          {upcomingHolidays.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-1.5 text-sm">
              <span className="text-slate-700">
                <span className="font-medium tabular-nums">{h.date}</span>
                <span className="ml-2">{h.name}</span>
                <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${h.states === "ALL" ? "bg-brand-mid/15 text-brand-deep" : "bg-slate-200/80 text-slate-600"}`}>
                  {h.states === "ALL" ? "all states" : h.states}
                </span>
              </span>
              <form action={deleteHolidayAction}>
                <input type="hidden" name="id" value={h.id} />
                <SubmitButton className="text-xs text-rose-600 hover:underline" savedToast="Holiday removed" confirmMessage={`Remove ${h.name} (${h.date})?`}>
                  Remove
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
        <form action={createHolidayAction} className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          ＋ Add holiday
          <input name="date" type="date" className={inputCls} />
          <input name="name" placeholder="Name" className={`${inputCls} min-w-48 flex-1`} />
          <StatesPicker name="states" />
          <SubmitButton className={saveBtn} savedToast="Holiday added">
            Add
          </SubmitButton>
        </form>
        <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
          Used by the board (PH badges), leave requests (heads-up warnings) and the wallboard banner. Verify late-gazetted dates each year.
        </p>
      </Card>
    </div>
  );
}

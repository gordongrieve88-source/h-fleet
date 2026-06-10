import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isEditRole } from "@/lib/auth/roles";
import { referenceRepo } from "@/lib/db/repositories";
import { PageHeader, Card } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { StatesPicker } from "@/components/StatesPicker";
import { todayUTC, ymd } from "@/lib/wfm/date";
import {
  createLeaveTypeAction,
  updateLeaveTypeAction,
  toggleLeaveTypeActive,
  createHolidayAction,
  deleteHolidayAction,
} from "./actions";

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-brand-mid focus:outline-none focus:ring-1 focus:ring-brand-mid";
const saveBtn = "rounded-lg bg-brand-mid px-3 py-1 text-xs font-semibold text-white hover:bg-brand-deep";

export default async function SetupPage() {
  const user = await getCurrentUser();
  if (!isEditRole(user?.role)) redirect("/fleet");

  const [leaveTypes, holidays] = await Promise.all([
    referenceRepo.listAllLeaveTypes(),
    referenceRepo.listAllHolidays(),
  ]);
  const todayKey = ymd(todayUTC());
  const upcomingHolidays = holidays.filter((h) => h.date >= todayKey);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Setup"
        description="Leave types and public holidays. Changes here flow straight through to the board, planner and reports — nothing is hardcoded."
      />

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

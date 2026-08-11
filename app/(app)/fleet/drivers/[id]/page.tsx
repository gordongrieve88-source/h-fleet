import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isEditRole } from "@/lib/auth/roles";
import { fleetRepo } from "@/lib/db/repositories";
import { saveDriverProfileSection } from "@/app/(app)/fleet/admin-actions";
import { PageHeader, Card } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-brand-mid focus:outline-none focus:ring-1 focus:ring-brand-mid";
const saveBtn = "rounded-lg bg-brand-mid px-3 py-1 text-xs font-semibold text-white hover:bg-brand-deep";

type ProfileField = { code: string; label: string; section: string; kind: string; value: string };

function FieldInput({ field }: { field: ProfileField }) {
  if (field.kind === "YESNO") {
    return (
      <label className="flex cursor-pointer items-center gap-2 py-0.5 text-sm text-slate-700">
        <input type="checkbox" name={field.code} defaultChecked={field.value === "yes"} className="shrink-0 accent-[#00843d]" />
        {field.label}
      </label>
    );
  }
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{field.label}</span>
      <input type={field.kind === "DATE" ? "date" : "text"} name={field.code} defaultValue={field.value} className={inputCls} />
    </label>
  );
}

/**
 * A driver's profile — the onboarding checklist, section by section. Each
 * card is its own form: fill in what you have, Save that card, move on.
 * The field catalog itself is managed in Setup.
 */
export default async function DriverProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!isEditRole(user?.role)) redirect("/fleet");

  const id = Number((await params).id);
  const driver = Number.isInteger(id) ? await fleetRepo.getDriver(id) : null;
  if (!driver) notFound();

  const fields = await fleetRepo.driverProfile(driver.id);
  const sections: { name: string; fields: ProfileField[] }[] = [];
  for (const f of fields) {
    const s = sections.find((x) => x.name === f.section);
    if (s) s.fields.push(f);
    else sections.push({ name: f.section, fields: [f] });
  }
  const filled = fields.filter((f) => f.value !== "").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={driver.name}
        description={`#${driver.employeeNo} · ${driver.depot.name}${driver.workgroup ? ` · ${driver.workgroup}` : ""}${
          driver.isActive ? "" : " · INACTIVE"
        } — onboarding checklist: ${filled} of ${fields.length} fields on file.`}
      />
      <p className="text-xs">
        <Link href="/fleet/drivers" className="font-medium text-brand-mid hover:underline">
          ← All drivers
        </Link>
        <span className="ml-3 text-slate-400">
          Name, depot and work group are edited from the Drivers list; inductions are ticked there too.
        </span>
      </p>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {sections.map((s) => {
          const wide = s.fields.length > 10;
          return (
            <Card key={s.name} title={s.name} className={wide ? "lg:col-span-2" : ""}>
              <form action={saveDriverProfileSection}>
                <input type="hidden" name="driverId" value={driver.id} />
                <input type="hidden" name="section" value={s.name} />
                <div className={`px-4 py-3 ${wide ? "grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3" : "space-y-2"}`}>
                  {s.fields.map((f) => (
                    <FieldInput key={f.code} field={f} />
                  ))}
                </div>
                <div className="flex justify-end border-t border-slate-100 px-4 py-2">
                  <SubmitButton className={saveBtn} savedToast={`${s.name} saved`}>
                    Save {s.name.toLowerCase()}
                  </SubmitButton>
                </div>
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

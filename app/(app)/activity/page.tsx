import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isApproverRole } from "@/lib/auth/roles";
import { auditRepo } from "@/lib/db/repositories";
import { PageHeader, Card } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";

const FILTERS: { key: string; label: string; prefix: string | null }[] = [
  { key: "all", label: "Everything", prefix: null },
  { key: "fleet", label: "Fleet", prefix: "fleet." },
  { key: "setup", label: "Setup", prefix: "setup." },
];

const DOT: Record<string, string> = {
  fleet: "bg-teal-500",
  setup: "bg-slate-400",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const user = await getCurrentUser();
  if (!isApproverRole(user?.role)) redirect("/fleet");
  const { f } = await searchParams;
  const filter = FILTERS.find((x) => x.key === f) ?? FILTERS[0];

  const all = await auditRepo.listRecent(300);
  const rows = filter.prefix ? all.filter((r) => r.action.startsWith(filter.prefix!)) : all;

  const fmtAt = (d: Date) =>
    d.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Australia/Sydney" });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity"
        description="The audit trail — every change anyone makes, newest first. Nothing in H-Fleet happens silently."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((x) => (
              <Link
                key={x.key}
                href={x.key === "all" ? "/activity" : `/activity?f=${x.key}`}
                className={
                  x.key === filter.key
                    ? "rounded-full bg-brand-mid px-3 py-1 text-xs font-semibold text-white"
                    : "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-slate-300"
                }
              >
                {x.label}
              </Link>
            ))}
          </div>
        }
      />

      <Card title="Recent changes" count={rows.length}>
        {rows.length === 0 ? (
          <EmptyState icon="🕐" title="No activity recorded yet for this filter." />
        ) : (
          <ul className="divide-y divide-slate-50">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-4 py-2 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[r.action.split(".")[0]] ?? "bg-slate-400"}`} />
                <span className="min-w-0 flex-1 text-slate-700">{r.summary}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {r.userName} · {fmtAt(r.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

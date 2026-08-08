import { getCurrentUser, listDemoUsers } from "@/lib/auth";
import { authMode } from "@/lib/auth/config";
import { roleLabel, roleAccessLabel, isEditRole, isApproverRole, isInsightsRole, isManagerRole } from "@/lib/auth/roles";
import { notificationRepo, fleetRepo } from "@/lib/db/repositories";
import { todayUTC } from "@/lib/wfm/date";
import { Sidebar } from "@/components/Sidebar";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { ToastProvider } from "@/components/Toast";
import { NotificationsBell, type NotificationItem } from "@/components/NotificationsBell";
import { CommandPalette, PaletteButton, type PaletteEntry } from "@/components/CommandPalette";

/**
 * The authenticated shell: dark sidebar (nav + signed-in user), light content
 * column with a slim topbar (search/⌘K, demo chip, notification bell).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const demo = authMode() === "demo";
  const [user, users] = await Promise.all([getCurrentUser(), demo ? listDemoUsers() : Promise.resolve([])]);
  const canEdit = isEditRole(user?.role);
  const canApprove = isApproverRole(user?.role);
  const canInsights = isInsightsRole(user?.role);
  const canManage = isManagerRole(user?.role);

  const [rawNotifications, unread] = await Promise.all([
    user ? notificationRepo.listForUser(user.id) : Promise.resolve([]),
    user ? notificationRepo.unreadCount(user.id) : Promise.resolve(0),
  ]);
  const notifications: NotificationItem[] = rawNotifications.map((n) => ({
    id: n.id,
    at: n.at.toISOString(),
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: n.href,
    unread: n.readAt == null,
  }));

  // Command palette entries, filtered by what this role can open.
  const pages: PaletteEntry[] = [
    { label: "My roster", hint: "My truck, times and leave", href: "/me" },
    { label: "Fleet board", hint: "Daily truck board", href: "/fleet" },
    { label: "Week ahead", hint: "Cover planning, 7 days out", href: "/fleet/week" },
    { label: "Fleet wallboard", hint: "Depot TV — today's trucks", href: "/wallboard/fleet" },
    ...(canEdit
      ? [
          { label: "Driver leave", hint: "Fleet leave planner", href: "/fleet/leave" },
          { label: "Import allocations", hint: "Daily Syncrotess PDF", href: "/fleet/import" },
          { label: "Compliance", hint: "Licences, medicals, inductions", href: "/fleet/compliance" },
          { label: "Drivers", hint: "Fleet master data", href: "/fleet/drivers" },
          { label: "Trucks", hint: "Fleet master data", href: "/fleet/trucks" },
        ]
      : []),
    ...(canManage ? [{ label: "Depots", hint: "Fleet regions & depots", href: "/fleet/depots" }] : []),
    ...(canInsights ? [{ label: "Fleet reports", hint: "Leave · utilisation · availability", href: "/fleet/reports" }] : []),
    ...(canApprove
      ? [
          { label: "Approvals", hint: "Driver leave queue", href: "/approvals" },
          { label: "Activity", hint: "Audit trail", href: "/activity" },
        ]
      : []),
    ...(canManage ? [{ label: "Setup", hint: "Leave types & public holidays", href: "/setup" }] : []),
  ];
  const fleetDrivers = canEdit ? await fleetRepo.listDrivers() : [];
  const people: PaletteEntry[] = fleetDrivers.map((d) => ({
    label: d.name,
    hint: `Driver · ${d.depot.name} · #${d.employeeNo}`,
    href: `/fleet/drivers?q=${encodeURIComponent(d.name)}`,
  }));

  const dateLabel = todayUTC().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  const userCard = (
    <div>
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px] font-semibold text-white">{user?.displayName ?? "—"}</div>
          <div className="text-[10.5px] text-white/45">{user ? roleLabel(user.role) : ""}</div>
        </div>
        {user && (
          <span className="shrink-0 rounded-full bg-brand-bright/20 px-2 py-0.5 text-[10px] font-semibold text-brand-bright">
            {roleAccessLabel(user.role)}
          </span>
        )}
      </div>
      {demo && user && <RoleSwitcher users={users} currentUserId={user.id} />}
      {!demo && (
        <form action="/auth/logout" method="post" className="mt-2">
          <button className="w-full rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-xs text-white/80 hover:bg-white/15 hover:text-white">
            Sign out
          </button>
        </form>
      )}
    </div>
  );

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar canEdit={canEdit} canApprove={canApprove} canInsights={canInsights} canManage={canManage} userCard={userCard} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="print-hide sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-5 backdrop-blur">
            <PaletteButton />
            {demo && (
              <span
                className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 sm:inline"
                title="Local demo — simulated login, local database. Production signs in with Microsoft Entra ID (AUTH_MODE=entra)."
              >
                Demo build
              </span>
            )}
            <div className="flex-1" />
            <span className="hidden text-sm text-slate-400 md:inline">{dateLabel}</span>
            <NotificationsBell items={notifications} unread={unread} />
          </header>
          <main className="mx-auto w-full max-w-[1500px] flex-1 px-5 py-6">{children}</main>
          <footer className="print-hide border-t border-slate-200 px-5 py-3 text-xs text-slate-400">
            {demo ? "H-Fleet · demo build · local SQLite · simulated login" : "H-Fleet"}
          </footer>
        </div>
      </div>
      <CommandPalette pages={pages} people={people} />
    </ToastProvider>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconTv,
  IconCheckBadge,
  IconPlane,
  IconChart,
  IconHistory,
  IconPeople,
  IconSettings,
  IconTruck,
} from "./Icons";

type Access = "all" | "approve" | "insights" | "edit" | "admin";

const GROUPS: {
  label: string | null;
  links: { href: string; label: string; access: Access; icon: React.ComponentType<{ className?: string }>; newTab?: boolean }[];
}[] = [
  {
    label: "Fleet",
    links: [
      { href: "/me", label: "My roster", access: "all", icon: IconPeople },
      { href: "/fleet", label: "Fleet board", access: "all", icon: IconTruck },
      { href: "/fleet/week", label: "Week ahead", access: "all", icon: IconChart },
      { href: "/fleet/leave", label: "Driver leave", access: "edit", icon: IconPlane },
      { href: "/fleet/import", label: "Import allocations", access: "edit", icon: IconHistory },
      { href: "/fleet/compliance", label: "Compliance", access: "edit", icon: IconCheckBadge },
      { href: "/fleet/reports", label: "Fleet reports", access: "insights", icon: IconChart },
      { href: "/fleet/intelligence", label: "Fleet intelligence", access: "insights", icon: IconChart },
      { href: "/fleet/drivers", label: "Drivers", access: "edit", icon: IconPeople },
      { href: "/fleet/trucks", label: "Trucks", access: "edit", icon: IconTruck },
      { href: "/fleet/depots", label: "Depots", access: "admin", icon: IconSettings },
    ],
  },
  {
    label: "Manage",
    links: [
      { href: "/approvals", label: "Approvals", access: "approve", icon: IconCheckBadge },
      { href: "/activity", label: "Activity", access: "approve", icon: IconHistory },
    ],
  },
  {
    label: "Admin",
    links: [{ href: "/setup", label: "Setup", access: "admin", icon: IconSettings }],
  },
];

function isActive(pathname: string, href: string) {
  // Exact-match section roots that have sibling links nested under them.
  if (href === "/" || href === "/fleet") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  canEdit,
  canApprove,
  canInsights,
  canManage,
  userCard,
}: {
  canEdit: boolean;
  canApprove: boolean;
  canInsights: boolean;
  /** Manager-only areas: org structure (Depots) and Setup. */
  canManage: boolean;
  /** Server-rendered user block (name, role badge, switcher) slotted in. */
  userCard: React.ReactNode;
}) {
  const pathname = usePathname();
  const visible = (access: Access) =>
    access === "all" ||
    (access === "approve" && canApprove) ||
    (access === "insights" && canInsights) ||
    (access === "edit" && canEdit) ||
    (access === "admin" && canManage);

  return (
    <aside className="on-dark print-hide sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-brand-deep text-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <img src="/logo.png" alt="H-Fleet" className="h-9 w-9" />
        <div className="leading-tight">
          <div className="font-heading text-[15px] font-semibold tracking-tight">
            H-<span className="text-brand-bright">Fleet</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {GROUPS.map((g) => {
          const links = g.links.filter((l) => visible(l.access));
          if (links.length === 0) return null;
          return (
            <div key={g.label ?? "ops"}>
              {g.label && (
                <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                  {g.label}
                </div>
              )}
              <ul className="space-y-0.5">
                {links.map((l) => {
                  const active = isActive(pathname, l.href);
                  const Icon = l.icon;
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        target={l.newTab ? "_blank" : undefined}
                        className={
                          active
                            ? "flex items-center gap-2.5 rounded-lg bg-white/12 px-2.5 py-2 text-[13px] font-semibold text-white ring-1 ring-inset ring-brand-bright/40"
                            : "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/65 hover:bg-white/8 hover:text-white"
                        }
                      >
                        <Icon className={active ? "h-[18px] w-[18px] text-brand-bright" : "h-[18px] w-[18px]"} />
                        {l.label}
                        {l.newTab && <span className="ml-auto text-[10px] text-white/35">↗</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Wallboard — utility link for the depot TV, kept out of the daily nav */}
      <div className="border-t border-white/10 px-3 py-2">
        <Link
          href="/wallboard/fleet"
          target="_blank"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/65 hover:bg-white/8 hover:text-white"
        >
          <IconTv className="h-[18px] w-[18px]" />
          Open wallboard
          <span className="ml-auto text-[10px] text-white/35">↗</span>
        </Link>
      </div>

      {/* Signed-in user (server-rendered slot) */}
      <div className="border-t border-white/10 p-3">{userCard}</div>
    </aside>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconBell } from "./Icons";
import { markAllNotificationsRead } from "@/lib/notifications/actions";

export type NotificationItem = {
  id: number;
  at: string; // ISO
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  unread: boolean;
};

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const KIND_DOT: Record<string, string> = {
  leave: "bg-violet-500",
  fleet: "bg-teal-500",
  system: "bg-slate-400",
};

/** The bell in the top bar: unread badge, popover list, mark-all-read. */
export function NotificationsBell({ items, unread }: { items: NotificationItem[]; unread: number }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      startTransition(async () => {
        await markAllNotificationsRead();
        router.refresh();
      });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
      >
        <IconBell />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-pop-in absolute right-0 top-11 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-pop">
          <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">
            Notifications
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Nothing yet — you&apos;re up to date.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-50 overflow-y-auto">
              {items.map((n) => {
                const inner = (
                  <div className="flex gap-2.5 px-4 py-2.5">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_DOT[n.kind] ?? "bg-slate-400"} ${n.unread ? "" : "opacity-30"}`} />
                    <span className="min-w-0">
                      <span className={`block truncate text-[13px] ${n.unread ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                        {n.title}
                      </span>
                      {n.body && <span className="block truncate text-xs text-slate-400">{n.body}</span>}
                      <span className="block text-[10.5px] text-slate-300">{timeAgo(n.at)}</span>
                    </span>
                  </div>
                );
                return (
                  <li key={n.id} className="hover:bg-slate-50">
                    {n.href ? (
                      <Link href={n.href} onClick={() => setOpen(false)}>
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

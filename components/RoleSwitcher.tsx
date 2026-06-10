"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDemoUser } from "@/lib/auth/actions";
import { ROLES, roleLabel } from "@/lib/auth/roles";

type DemoUser = { id: number; displayName: string; role: string };

/**
 * Demo-only: pick which seeded user is "signed in". Replaced by Microsoft 365
 * sign-in in production. Styled for the dark sidebar.
 */
export function RoleSwitcher({ users, currentUserId }: { users: DemoUser[]; currentUserId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const groups: [string, DemoUser[]][] = [
    [`${roleLabel(ROLES.MANAGER)} (full access)`, users.filter((u) => u.role === ROLES.MANAGER)],
    [`${roleLabel(ROLES.SUPERVISOR)} (edit + approve)`, users.filter((u) => u.role === ROLES.SUPERVISOR)],
    [`${roleLabel(ROLES.STAFF)} (view only)`, users.filter((u) => u.role === ROLES.STAFF)],
  ];

  return (
    <select
      aria-label="View as"
      defaultValue={currentUserId}
      disabled={pending}
      onChange={(e) => {
        const id = Number(e.target.value);
        if (id === currentUserId) return;
        startTransition(async () => {
          await setDemoUser(id);
          router.refresh();
        });
      }}
      className="mt-2 w-full rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-xs text-white disabled:opacity-60 [&>optgroup]:bg-brand-deep [&>optgroup]:text-white/60 [&>option]:bg-brand-deep [&>option]:text-white"
    >
      {groups.map(
        ([label, list]) =>
          list.length > 0 && (
            <optgroup key={label} label={label}>
              {list.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </optgroup>
          ),
      )}
    </select>
  );
}

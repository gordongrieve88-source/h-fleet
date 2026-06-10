import type { AppUser } from "@/generated/prisma/client";
import { auditRepo } from "@/lib/db/repositories";

/**
 * One-line audit helper — every server action that changes data calls this,
 * so the Activity feed is a complete "who did what, when".
 */
export function logAction(
  user: AppUser | null,
  action: string,
  entity: string,
  entityId: number | null,
  summary: string,
  meta?: unknown,
) {
  return auditRepo.log({
    userId: user?.id ?? null,
    userName: user?.displayName ?? "System",
    action,
    entity,
    entityId,
    summary,
    meta,
  });
}

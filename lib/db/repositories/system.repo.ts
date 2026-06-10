import { prisma } from "../client";

/** Audit log + notifications — the v2 "everything is accountable" layer. */
export const auditRepo = {
  log(entry: {
    userId: number | null;
    userName: string;
    action: string;
    entity: string;
    entityId?: number | null;
    summary: string;
    meta?: unknown;
  }) {
    return prisma.auditLog.create({
      data: {
        userId: entry.userId,
        userName: entry.userName,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
        meta: entry.meta == null ? null : JSON.stringify(entry.meta),
      },
    });
  },
  listRecent(limit = 100) {
    return prisma.auditLog.findMany({ orderBy: { at: "desc" }, take: limit });
  },
};

export const notificationRepo = {
  create(data: { userId: number; kind: string; title: string; body?: string | null; href?: string | null }) {
    return prisma.notification.create({ data });
  },
  /** Notify every Supervisor/Manager login (e.g. new pending request). */
  async createForApprovers(data: { kind: string; title: string; body?: string | null; href?: string | null }) {
    const approvers = await prisma.appUser.findMany({
      where: { isActive: true, role: { in: ["SUPERVISOR", "MANAGER"] } },
    });
    if (approvers.length === 0) return;
    await prisma.notification.createMany({
      data: approvers.map((u) => ({ ...data, userId: u.id })),
    });
  },
  listForUser(userId: number, limit = 30) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { at: "desc" },
      take: limit,
    });
  },
  unreadCount(userId: number) {
    return prisma.notification.count({ where: { userId, readAt: null } });
  },
  markAllRead(userId: number) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
};

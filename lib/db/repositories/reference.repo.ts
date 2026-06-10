import { prisma } from "../client";

/** Leave types + public holidays — the shared config data. */
export const referenceRepo = {
  listLeaveTypes() {
    return prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  },
  listAllLeaveTypes() {
    return prisma.leaveType.findMany({ orderBy: { sortOrder: "asc" } });
  },
  createLeaveType(data: { code: string; name: string; colorHex: string; sortOrder: number }) {
    return prisma.leaveType.create({ data });
  },
  updateLeaveType(code: string, data: { name: string; colorHex: string; sortOrder: number }) {
    return prisma.leaveType.update({ where: { code }, data });
  },
  setLeaveTypeActive(code: string, isActive: boolean) {
    return prisma.leaveType.update({ where: { code }, data: { isActive } });
  },

  /** Holidays in [fromKey, toKey] (inclusive), ordered. */
  listHolidays(fromKey: string, toKey: string) {
    return prisma.publicHoliday.findMany({
      where: { date: { gte: fromKey, lte: toKey } },
      orderBy: { date: "asc" },
    });
  },
  listAllHolidays() {
    return prisma.publicHoliday.findMany({ orderBy: { date: "asc" } });
  },
  createHoliday(data: { date: string; name: string; states: string }) {
    return prisma.publicHoliday.create({ data });
  },
  deleteHoliday(id: number) {
    return prisma.publicHoliday.delete({ where: { id } });
  },
};

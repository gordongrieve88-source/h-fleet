import { readFile } from "node:fs/promises";
import type { ExternalPerson, ExternalBalance, PeopleProvider } from "../types";

/**
 * CSV provider — the path that works TODAY without an API project. Workday
 * (and most HR systems) can schedule a report drop to a file share; point
 * WORKDAY_PEOPLE_CSV / WORKDAY_BALANCES_CSV at those files.
 *
 * Expected people columns (header row, case/space-insensitive):
 *   employee_no, name, depot, workgroup, active
 * Expected balance columns:
 *   employee_no, leave_type, year, entitled_days, opening_balance
 */

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const header = rows.shift();
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const truthy = (s: string) => /^(y|yes|true|1|a|active)$/i.test(s.trim());

function pick(row: Record<string, string>, ...names: string[]): string {
  for (const n of names) if (row[n] !== undefined && row[n] !== "") return row[n];
  return "";
}

export const csvPeopleProvider: PeopleProvider = {
  kind: "people",
  id: "csv",
  label: "HR CSV export (scheduled file drop)",
  isSample: false,

  unconfiguredReason() {
    if (!process.env.WORKDAY_PEOPLE_CSV?.trim()) {
      return "Set WORKDAY_PEOPLE_CSV to the people export path (and WORKDAY_BALANCES_CSV for entitlements).";
    }
    return null;
  },

  async fetchPeople(): Promise<ExternalPerson[]> {
    const path = process.env.WORKDAY_PEOPLE_CSV!.trim();
    const rows = parseCsv(await readFile(path, "utf8"));
    return rows
      .map((r) => ({
        employeeNo: pick(r, "employee_no", "employee_number", "emp_no", "employee_id"),
        name: pick(r, "name", "full_name", "employee_name"),
        depotName: pick(r, "depot", "plant", "location", "cost_centre"),
        workgroup: pick(r, "workgroup", "work_group", "team"),
        isActive: truthy(pick(r, "active", "is_active", "status") || "yes"),
      }))
      .filter((p) => p.employeeNo !== "");
  },

  async fetchBalances(year: number): Promise<ExternalBalance[]> {
    const path = process.env.WORKDAY_BALANCES_CSV?.trim();
    if (!path) return [];
    const rows = parseCsv(await readFile(path, "utf8"));
    return rows
      .map((r) => ({
        employeeNo: pick(r, "employee_no", "employee_number", "emp_no", "employee_id"),
        leaveTypeCode: (pick(r, "leave_type", "leave_code", "type") || "AL").toUpperCase(),
        year: Number(pick(r, "year")) || year,
        entitledDays: Number(pick(r, "entitled_days", "entitlement", "entitled")) || 0,
        openingBalance: Number(pick(r, "opening_balance", "carry_over", "balance")) || 0,
      }))
      .filter((b) => b.employeeNo !== "");
  },
};

/** Exported for tests — the CSV reader is the risky part of this provider. */
export const _parseCsv = parseCsv;

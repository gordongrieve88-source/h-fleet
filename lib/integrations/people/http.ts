import type { ExternalPerson, ExternalBalance, PeopleProvider } from "../types";

/**
 * PRODUCTION provider — a REST endpoint exposing the HR extract. Works as
 * soon as WORKDAY_API_URL / WORKDAY_API_TOKEN are set; no code change.
 *
 * Expected shape (either a bare array or {data|items|rows: [...]}) :
 *   GET {WORKDAY_API_URL}/people
 *     [{ employeeNumber, fullName, location, workgroup, active }]
 *   GET {WORKDAY_API_URL}/balances?year=YYYY
 *     [{ employeeNumber, leaveType, year, entitledDays, openingBalance }]
 *
 * Field names are read tolerantly (several aliases per field) because every
 * Workday tenant names its report columns differently. If your extract uses
 * names not covered here, map them in the integration middleware or extend
 * `pick` below — that is the only place that should need touching.
 */

function pick(row: Record<string, unknown>, ...names: string[]): string {
  for (const n of names) {
    const v = row[n];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function unwrap(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    for (const key of ["data", "items", "rows", "results", "Report_Entry"]) {
      const v = (payload as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v as Record<string, unknown>[];
    }
  }
  return [];
}

async function get(path: string): Promise<unknown> {
  const base = process.env.WORKDAY_API_URL!.trim().replace(/\/$/, "");
  const token = process.env.WORKDAY_API_TOKEN!.trim();
  const res = await fetch(`${base}${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HR API ${path} returned ${res.status} ${res.statusText}`);
  return res.json();
}

const truthy = (s: string) => s === "" || /^(y|yes|true|1|a|active)$/i.test(s);

export const httpPeopleProvider: PeopleProvider = {
  kind: "people",
  id: "http",
  label: "HR REST API (Workday extract)",
  isSample: false,

  unconfiguredReason() {
    if (!process.env.WORKDAY_API_URL?.trim()) return "Set WORKDAY_API_URL to the HR extract endpoint.";
    if (!process.env.WORKDAY_API_TOKEN?.trim()) return "Set WORKDAY_API_TOKEN for the HR extract endpoint.";
    return null;
  },

  async fetchPeople(): Promise<ExternalPerson[]> {
    return unwrap(await get("/people"))
      .map((r) => ({
        employeeNo: pick(r, "employeeNumber", "employee_no", "employeeId", "Employee_ID"),
        name: pick(r, "fullName", "name", "legalName", "Worker"),
        depotName: pick(r, "location", "depot", "plant", "costCentre", "Cost_Center"),
        workgroup: pick(r, "workgroup", "workGroup", "team", "jobFamily"),
        isActive: truthy(pick(r, "active", "isActive", "status", "Active_Status")),
      }))
      .filter((p) => p.employeeNo !== "");
  },

  async fetchBalances(year: number): Promise<ExternalBalance[]> {
    return unwrap(await get(`/balances?year=${year}`))
      .map((r) => ({
        employeeNo: pick(r, "employeeNumber", "employee_no", "employeeId", "Employee_ID"),
        leaveTypeCode: (pick(r, "leaveType", "leave_type", "planCode") || "AL").toUpperCase(),
        year: Number(pick(r, "year")) || year,
        entitledDays: Number(pick(r, "entitledDays", "entitlement", "accrued")) || 0,
        openingBalance: Number(pick(r, "openingBalance", "carryOver", "balance")) || 0,
      }))
      .filter((b) => b.employeeNo !== "");
  },
};

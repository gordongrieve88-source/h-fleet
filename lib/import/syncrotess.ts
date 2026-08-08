/**
 * Syncrotess daily allocation sheet — tolerant, entity-matching parser.
 *
 * We don't trust the PDF's layout: a line becomes an allocation when its
 * tokens match REAL fleet data — a truck code from the Truck table, a driver
 * by employee number or (normalised) name, a time. Anything the sheet says
 * that we can't match is surfaced in the preview instead of guessed at.
 * Pure functions over extracted lines; PDF handling lives in ./pdf.ts.
 */

export interface ImportDriverRef {
  id: number;
  name: string;
  empNo: string;
}

export type EntryStatus = "ok" | "no-driver" | "no-time" | "unknown-truck" | "duplicate";

export interface ParsedEntry {
  line: string;
  truckId: string | null;
  truckToken: string;
  driverId: number | null;
  driverName: string | null;
  time: string | null; // "HH:MM" 24h
  status: EntryStatus;
}

export interface ParseOutcome {
  dateKey: string | null; // date printed on the sheet, if we can find one
  entries: ParsedEntry[];
}

/** Letters only, single-spaced, lowercase — the name-matching alphabet. */
function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** All name forms a driver might appear under on the sheet. */
function nameKeys(name: string): string[] {
  const full = normName(name);
  const parts = full.split(" ");
  const keys = new Set([full]);
  if (parts.length >= 2) {
    keys.add(`${parts[parts.length - 1]} ${parts.slice(0, -1).join(" ")}`); // "last first"
    keys.add(`${parts[0]} ${parts[parts.length - 1]}`); // "first last" without middles
    keys.add(`${parts[parts.length - 1]} ${parts[0]}`);
  }
  return [...keys];
}

const TRUCK_TOKEN = /^[A-Z]{2,4}\d{3,5}$/;
const TIME_RE = /\b([01]?\d|2[0-3]):([0-5]\d)\s*(am|pm)?\b/i;

function normaliseTime(h: number, m: number, ampm: string | undefined): string {
  let hour = h;
  const suffix = ampm?.toLowerCase();
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Find a date printed anywhere on the sheet (AU day-first for slashes). */
export function detectSheetDate(lines: string[]): string | null {
  const pad = (n: number) => String(n).padStart(2, "0");
  for (const line of lines) {
    const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(line);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const slash = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/.exec(line);
    if (slash) return `${slash[3]}-${pad(Number(slash[2]))}-${pad(Number(slash[1]))}`;
    const worded = /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/.exec(line);
    if (worded) {
      const month = MONTHS.indexOf(worded[2].slice(0, 3).toLowerCase());
      if (month >= 0) return `${worded[3]}-${pad(month + 1)}-${pad(Number(worded[1]))}`;
    }
  }
  return null;
}

export function parseAllocationLines(
  lines: string[],
  ctx: { truckIds: string[]; drivers: ImportDriverRef[] },
): ParseOutcome {
  const truckSet = new Map(ctx.truckIds.map((t) => [t.toUpperCase(), t]));
  const byEmpNo = new Map(ctx.drivers.map((d) => [d.empNo, d]));
  const byNameKey = new Map<string, ImportDriverRef>();
  for (const d of ctx.drivers) for (const k of nameKeys(d.name)) byNameKey.set(k, d);

  const entries: ParsedEntry[] = [];
  const seenTrucks = new Set<string>();
  const seenDrivers = new Set<number>();

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ").trim();
    const tokens = line.split(/\s+/);

    // The anchor: a token matching a REAL fleet code (any format the fleet
    // uses), falling back to "looks like a fleet code" so unknown trucks on
    // the sheet get flagged rather than silently dropped.
    const truckToken =
      tokens.find((t) => truckSet.has(t.toUpperCase())) ?? tokens.find((t) => TRUCK_TOKEN.test(t.toUpperCase()));
    if (!truckToken) continue;
    const truckId = truckSet.get(truckToken.toUpperCase()) ?? null;

    // Time (first one on the line = start time).
    const tm = TIME_RE.exec(line);
    const time = tm ? normaliseTime(Number(tm[1]), Number(tm[2]), tm[3]) : null;

    // Driver: employee number beats name; names match on normalised forms.
    let driver: ImportDriverRef | null = null;
    for (const t of tokens) {
      const hit = /^\d{3,7}$/.test(t) ? byEmpNo.get(t) : undefined;
      if (hit) {
        driver = hit;
        break;
      }
    }
    if (!driver) {
      const lineNorm = ` ${normName(line)} `;
      for (const [key, d] of byNameKey) {
        if (key && lineNorm.includes(` ${key} `)) {
          driver = d;
          break;
        }
      }
    }

    let status: EntryStatus;
    if (!truckId) status = "unknown-truck";
    else if (seenTrucks.has(truckId) || (driver && seenDrivers.has(driver.id))) status = "duplicate";
    else if (!driver) status = "no-driver";
    else if (!time) status = "no-time";
    else status = "ok";

    if (truckId && status !== "duplicate") seenTrucks.add(truckId);
    if (driver && status !== "duplicate") seenDrivers.add(driver.id);

    entries.push({
      line,
      truckId,
      truckToken,
      driverId: driver?.id ?? null,
      driverName: driver?.name ?? null,
      time,
      status,
    });
  }

  return { dateKey: detectSheetDate(lines), entries };
}

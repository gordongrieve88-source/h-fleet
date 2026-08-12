/**
 * Syncrotess daily allocation sheet — tolerant, entity-matching parser.
 *
 * We don't trust the PDF's layout: a line becomes an allocation when its
 * tokens match REAL fleet data — a truck code from the Truck table, a driver
 * by employee number or (normalised) name, a time. Anything the sheet says
 * that we can't match is surfaced in the preview instead of guessed at.
 * Pure functions over extracted lines; PDF handling lives in ./pdf.ts.
 */

import { samePlantWord } from "@/lib/wfm/fleet";

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
  /** The sheet's Location column (the plant), when the row is tabular. */
  location: string | null;
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
// The sheet's shorthand: "8AM", "1pm", "midday".
const BARE_HOUR_RE = /\b([01]?\d|2[0-3])\s*(am|pm)\b/i;

function normaliseTime(h: number, m: number, ampm: string | undefined): string {
  let hour = h;
  const suffix = ampm?.toLowerCase();
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * A start time in any of the sheet's habits: "5:30", "6.45am", "8AM",
 * "midday". Null when the text carries no time.
 */
export function parseLooseTime(text: string): string | null {
  const tm = TIME_RE.exec(text.replace(/(\d)\.(\d{2})(?!\d)/g, "$1:$2"));
  if (tm) return normaliseTime(Number(tm[1]), Number(tm[2]), tm[3]);
  const bare = BARE_HOUR_RE.exec(text);
  if (bare) return normaliseTime(Number(bare[1]), 0, bare[2]);
  if (/\b(midday|noon)\b/i.test(text)) return "12:00";
  return null;
}

/**
 * The sheet's other habit in the time column: "<plant> start" — the truck
 * works out of that plant for the day. Returns the plant word, or null.
 * "late start" / "early start" are timing notes, not plants.
 */
export function locationFromNote(text: string): string | null {
  const m = /\b([A-Za-z]{3,})\s+start\b/i.exec(text);
  if (!m) return null;
  return /^(late|early|normal|usual|day|night|first)$/i.test(m[1]) ? null : m[1].toUpperCase();
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

/** Syncrotess prints fleet codes with a dispatch-group suffix ("PLC2213-301"). */
function truckBase(token: string): string {
  return token.toUpperCase().replace(/-\d+$/, "");
}

export function parseAllocationLines(
  lines: string[],
  ctx: { truckIds: string[]; drivers: ImportDriverRef[]; plants?: string[] },
): ParseOutcome {
  // Known plant words (first word of each depot/block name) — a location is
  // only believed when it matches one. Layouts shuffle between sheets; a
  // fixed column index once swallowed a constant "SAS" column as the plant.
  const plantWords = [...new Set((ctx.plants ?? []).map((pl) => pl.trim().split(/\s+/)[0] ?? "").filter((w) => w.length >= 3))];
  const knownPlant = (text: string): string | null => {
    const clean = text.trim();
    const w = clean.split(/\s+/)[0] ?? "";
    if (!/^[A-Za-z]{3,}$/.test(w)) return null;
    return plantWords.some((pw) => samePlantWord(pw, w)) ? clean : null;
  };
  const truckSet = new Map(ctx.truckIds.map((t) => [t.toUpperCase(), t]));
  const byEmpNo = new Map(ctx.drivers.map((d) => [d.empNo, d]));
  const byNameKey = new Map<string, ImportDriverRef>();
  for (const d of ctx.drivers) for (const k of nameKeys(d.name)) byNameKey.set(k, d);

  // Employee numbers can be short (1–3 digits at HMA), so a bare number only
  // counts as one when it's RARE on the sheet — structural constants like the
  // truck-type "02" or the dispatch group "301" repeat on dozens of lines.
  const numberFreq = new Map<string, number>();
  for (const l of lines) {
    for (const t of new Set(l.split(/\s+/).filter((x) => /^\d{1,7}$/.test(x)))) {
      numberFreq.set(t, (numberFreq.get(t) ?? 0) + 1);
    }
  }

  const entries: ParsedEntry[] = [];
  const seenTrucks = new Set<string>();
  const seenDrivers = new Set<number>();

  for (const rawLine of lines) {
    const cols = rawLine.split("\t").map((c) => c.trim());
    const line = rawLine.replace(/\t/g, "  ").trim();
    const tokens = line.split(/\s+/);

    // The anchor: a token matching a REAL fleet code (any format the fleet
    // uses, dispatch-group suffix stripped), falling back to "looks like a
    // fleet code" so unknown trucks get flagged rather than silently dropped.
    const truckToken =
      tokens.find((t) => truckSet.has(truckBase(t))) ?? tokens.find((t) => TRUCK_TOKEN.test(truckBase(t)));
    if (!truckToken) continue;
    const truckId = truckSet.get(truckBase(truckToken)) ?? null;

    // Time (first one on the line = start time) — any of the sheet's habits.
    const time = parseLooseTime(line);

    // Driver first — a driver's surname can look like a plant, so the
    // location scan below skips the column their name sits in.

    // Driver: employee number beats name; names match on normalised forms.
    let driver: ImportDriverRef | null = null;
    for (const t of tokens) {
      if (!/^\d{1,7}$/.test(t) || (numberFreq.get(t) ?? 0) > 2) continue;
      const hit = byEmpNo.get(t);
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

    // Work location: the LAST column whose first word is a known plant (the
    // sheet may print home plant early and the day's plant later), skipping
    // the truck's own column and the driver's name column. Fallback: the
    // time column's "<plant> start" habit, validated the same way.
    let location: string | null = null;
    const driverKeys = driver ? nameKeys(driver.name) : [];
    for (const c of cols) {
      if (c.includes(truckToken)) continue;
      if (driverKeys.length && driverKeys.some((k) => k && ` ${normName(c)} `.includes(` ${k} `))) continue;
      // "<plant> start" is a note — keep the plant, drop the word "start".
      const note = locationFromNote(c);
      const hit = note ? knownPlant(note) : knownPlant(c);
      if (hit) location = hit;
    }
    if (!location) {
      const note = locationFromNote(line);
      if (note && (plantWords.length === 0 || knownPlant(note))) location = note;
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
      location,
      status,
    });
  }

  return { dateKey: detectSheetDate(lines), entries };
}

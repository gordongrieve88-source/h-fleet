import { fleetBoardRepo } from "@/lib/db/repositories/fleet-board.repo";
import { ymd } from "@/lib/wfm/date";
import type { ExternalVehicleDay, TelematicsProvider } from "../types";

/**
 * Telematics providers — what the trucks ACTUALLY did, as opposed to what the
 * roster planned. Feeds start-time variance and breakdown evidence.
 */

/**
 * DEMONSTRATION provider. Derives believable actuals from the saved board:
 * most trucks leave within a few minutes of their rostered time, a few run
 * late, and broken-down trucks never move. Deterministic per (truck, date)
 * so a demo repeats identically. Flagged isSample everywhere.
 */
export const sampleTelematicsProvider: TelematicsProvider = {
  kind: "telematics",
  id: "sample",
  label: "Sample telematics feed (demonstration data)",
  isSample: true,
  unconfiguredReason: () => null,

  async fetchDay(date: Date): Promise<ExternalVehicleDay[]> {
    // Read the BOARD, not just saved rows: real telematics reports on every
    // truck whether or not anyone saved that day's board, and this keeps a
    // demonstration working on any date.
    const rows = await fleetBoardRepo.getBoard(date);

    // Stable pseudo-random from the truck code + date — no Math.random, so
    // the same day always demonstrates the same numbers.
    const hash = (s: string) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return Math.abs(h);
    };

    return rows.map((r) => {
      const seed = hash(`${r.truck}|${ymd(date)}`);
      const status = r.status.trim().toUpperCase();
      const grounded = status.startsWith("OFF") || r.driverId == null;

      if (grounded) {
        return {
          truckId: r.truck,
          actualStart: null,
          odometerKm: 0,
          faultCode: status === "OFF-BD" ? ["P0087", "C1234", "P0217"][seed % 3] : null,
        };
      }

      // Mostly -3..+9 minutes off the rostered time; ~1 in 12 runs 20-45 late.
      const late = seed % 12 === 5;
      const delta = late ? 20 + (seed % 26) : (seed % 13) - 3;
      const base = r.time && /^\d{2}:\d{2}$/.test(r.time) ? r.time : "06:00";
      const [h, m] = base.split(":").map(Number);
      const total = Math.max(0, Math.min(24 * 60 - 1, h * 60 + m + delta));
      const actualStart = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

      return {
        truckId: r.truck,
        actualStart,
        odometerKm: 120 + (seed % 180),
        engineHours: Number((6 + (seed % 40) / 10).toFixed(1)),
        faultCode: status === "ON-SER" ? "B1042" : null,
      };
    });
  },
};

/**
 * PRODUCTION provider — a REST endpoint from the telematics vendor
 * (EROAD, MTData, Teletrac…). Live as soon as TELEMATICS_API_URL /
 * TELEMATICS_API_TOKEN are set.
 *
 * Expected: GET {TELEMATICS_API_URL}/vehicle-days?date=YYYY-MM-DD
 *   [{ vehicleRef, firstMovement | departureTime, odometerKm, engineHours, faultCode }]
 * `vehicleRef` must be (or contain) the fleet code H-Fleet knows the truck by;
 * a trailing dispatch suffix is stripped, like the roster import does.
 */
export const httpTelematicsProvider: TelematicsProvider = {
  kind: "telematics",
  id: "http",
  label: "Telematics REST API",
  isSample: false,

  unconfiguredReason() {
    if (!process.env.TELEMATICS_API_URL?.trim()) return "Set TELEMATICS_API_URL to the telematics endpoint.";
    if (!process.env.TELEMATICS_API_TOKEN?.trim()) return "Set TELEMATICS_API_TOKEN for the telematics endpoint.";
    return null;
  },

  async fetchDay(date: Date): Promise<ExternalVehicleDay[]> {
    const base = process.env.TELEMATICS_API_URL!.trim().replace(/\/$/, "");
    const token = process.env.TELEMATICS_API_TOKEN!.trim();
    const res = await fetch(`${base}/vehicle-days?date=${ymd(date)}`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Telematics API returned ${res.status} ${res.statusText}`);

    const payload: unknown = await res.json();
    const rows: Record<string, unknown>[] = Array.isArray(payload)
      ? (payload as Record<string, unknown>[])
      : (((payload as Record<string, unknown>)?.data ??
          (payload as Record<string, unknown>)?.items ??
          []) as Record<string, unknown>[]);

    const str = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());
    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    return rows
      .map((r) => {
        const ref = str(r.vehicleRef ?? r.vehicle ?? r.assetId ?? r.registration).toUpperCase().replace(/-\d+$/, "");
        const raw = str(r.firstMovement ?? r.departureTime ?? r.startTime);
        // Accept "06:12", "2026-08-08T06:12:00Z" and "6:12 am".
        const m = /(\d{1,2}):(\d{2})/.exec(raw);
        let actualStart: string | null = null;
        if (m) {
          let h = Number(m[1]);
          if (/pm/i.test(raw) && h < 12) h += 12;
          if (/am/i.test(raw) && h === 12) h = 0;
          actualStart = `${String(h).padStart(2, "0")}:${m[2]}`;
        }
        return {
          truckId: ref,
          actualStart,
          odometerKm: num(r.odometerKm ?? r.odometer),
          engineHours: num(r.engineHours),
          faultCode: str(r.faultCode ?? r.dtc) || null,
        };
      })
      .filter((v) => v.truckId !== "");
  },
};

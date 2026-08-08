import type { PeopleProvider, TelematicsProvider } from "./types";
import { samplePeopleProvider } from "./people/sample";
import { csvPeopleProvider } from "./people/csv";
import { httpPeopleProvider } from "./people/http";
import { sampleTelematicsProvider, httpTelematicsProvider } from "./telematics/providers";

/**
 * Which provider backs each connector — configuration, not code:
 *
 *   PEOPLE_PROVIDER=off | sample | csv | http     (default: off)
 *   TELEMATICS_PROVIDER=off | sample | http       (default: off)
 *
 * "off" is the default on purpose: a fresh install talks to nothing until
 * somebody deliberately turns a feed on.
 */

const PEOPLE: Record<string, PeopleProvider> = {
  sample: samplePeopleProvider,
  csv: csvPeopleProvider,
  http: httpPeopleProvider,
};

const TELEMATICS: Record<string, TelematicsProvider> = {
  sample: sampleTelematicsProvider,
  http: httpTelematicsProvider,
};

export function peopleProvider(): PeopleProvider | null {
  return PEOPLE[(process.env.PEOPLE_PROVIDER ?? "off").trim().toLowerCase()] ?? null;
}

export function telematicsProvider(): TelematicsProvider | null {
  return TELEMATICS[(process.env.TELEMATICS_PROVIDER ?? "off").trim().toLowerCase()] ?? null;
}

export interface ConnectorStatus {
  connector: "people" | "telematics";
  title: string;
  purpose: string;
  /** null when the connector is switched off entirely. */
  providerId: string | null;
  providerLabel: string | null;
  isSample: boolean;
  /** Why it can't run right now, or null when ready. */
  blockedReason: string | null;
  /** The env var that selects this connector's provider. */
  envVar: string;
  options: string[];
}

export function connectorStatuses(): ConnectorStatus[] {
  const people = peopleProvider();
  const tele = telematicsProvider();
  return [
    {
      connector: "people",
      title: "People & leave balances",
      purpose:
        "Driver master data and annual-leave entitlements from HR (Workday). Read-only: H-Fleet never writes back, and never computes pay.",
      providerId: people?.id ?? null,
      providerLabel: people?.label ?? null,
      isSample: people?.isSample ?? false,
      blockedReason: people ? people.unconfiguredReason() : "Switched off — set PEOPLE_PROVIDER to turn it on.",
      envVar: "PEOPLE_PROVIDER",
      options: ["off", "sample", "csv", "http"],
    },
    {
      connector: "telematics",
      title: "Telematics actuals",
      purpose:
        "What each truck actually did — real departure times, odometer and fault codes — so planned start times can be compared with reality.",
      providerId: tele?.id ?? null,
      providerLabel: tele?.label ?? null,
      isSample: tele?.isSample ?? false,
      blockedReason: tele ? tele.unconfiguredReason() : "Switched off — set TELEMATICS_PROVIDER to turn it on.",
      envVar: "TELEMATICS_PROVIDER",
      options: ["off", "sample", "http"],
    },
  ];
}

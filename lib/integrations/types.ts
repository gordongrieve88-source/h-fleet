/**
 * ===========================================================================
 *  SEAM — INBOUND INTEGRATIONS
 * ===========================================================================
 *  H-Fleet consumes data other systems own: people and leave balances from
 *  HR (Workday), vehicle actuals from telematics (EROAD/MTData/…). Each is a
 *  PROVIDER behind one of the interfaces below, selected by configuration.
 *
 *  The rules that keep this honest:
 *    1. A provider only READS from the far system. H-Fleet never writes back.
 *    2. Nothing lands without a diff the operator can see first (dry run).
 *    3. `isSample` marks demo providers and is recorded on every run, so a
 *       demonstration can never be mistaken for real vendor data later.
 *    4. Boundaries hold: we import leave BALANCES as roster context, never
 *       pay. H-Fleet still computes nothing financial.
 * ===========================================================================
 */

/** A person as the HR system describes them. */
export interface ExternalPerson {
  employeeNo: string;
  name: string;
  /** Free-text plant/depot name; matched to a Depot by first word. */
  depotName: string;
  workgroup: string;
  /** False for terminated/inactive employees — drives deactivation. */
  isActive: boolean;
}

/** An annual leave entitlement as HR holds it. */
export interface ExternalBalance {
  employeeNo: string;
  leaveTypeCode: string;
  year: number;
  entitledDays: number;
  openingBalance: number;
}

/** What telematics observed for one truck on one day. */
export interface ExternalVehicleDay {
  truckId: string;
  /** Observed departure, "HH:MM" 24h — null when the vehicle never moved. */
  actualStart: string | null;
  odometerKm?: number | null;
  engineHours?: number | null;
  faultCode?: string | null;
}

interface ProviderBase {
  /** Stable id stored on each run: "sample" | "csv" | "http". */
  readonly id: string;
  readonly label: string;
  /** True for demonstration providers that invent data. */
  readonly isSample: boolean;
  /** Human-readable reason the provider can't run, or null when ready. */
  unconfiguredReason(): string | null;
}

export interface PeopleProvider extends ProviderBase {
  readonly kind: "people";
  fetchPeople(): Promise<ExternalPerson[]>;
  fetchBalances(year: number): Promise<ExternalBalance[]>;
}

export interface TelematicsProvider extends ProviderBase {
  readonly kind: "telematics";
  fetchDay(date: Date): Promise<ExternalVehicleDay[]>;
}

export type AnyProvider = PeopleProvider | TelematicsProvider;

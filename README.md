# H-Fleet

The standalone daily truck/driver board for the metro agitator fleet —
**194 drivers, 148 trucks, 13 depots** — ported from the HMA Metro Roster
spreadsheet. Local demo today; production target is a **RHEL8 VM behind
nginx with SQL Server and Microsoft Entra ID sign-in** (`deploy/` has the
full kit — Azure App Service works through the same seams if the hosting
decision changes). Designed to later plug back into the H-Crew site as an
extension — same shell, same seams.

## Run it

```bash
npm install
npm run demo     # generates the client, applies migrations, seeds the real fleet, starts the dev server
npm test         # unit + repository tests (Vitest); CI runs these on every push
```

Open http://localhost:3002 (H-Fleet runs on **port 3002**; H-Crew owns 3001).

After pulling changes, run `npm run demo` again rather than `npm run dev`. The
generated Prisma client isn't committed, so a bare `dev` runs against a stale
one and any page touching a new table fails.

### On a phone or tablet

The board is built for the yard, so it's worth trying on a real device. Run
`npm run demo:lan` instead, then on a phone **on the same wi-fi** open
`http://<your-computer's-IP>:3002` — e.g. `http://192.168.1.24:3002`.

```bash
ipconfig getifaddr en0        # macOS
hostname -I | awk '{print $1}' # Linux
ipconfig                       # Windows — the IPv4 address
```

`demo:lan` serves to your whole local network, and the demo build uses the
simulated sign-in switcher rather than real auth. Fine on a home or office
network; don't run it on public wi-fi.
You start signed in as view-only Staff — use the switcher at the bottom of the
sidebar to view as a Supervisor or Manager (Gordon Grieve = full access).

## What's in the box

| Area | What it does |
| --- | --- |
| **Fleet board** | `/fleet` — the daily truck board: drag a driver between trucks (or in from the spare rail) to move/swap — on touch screens, tap the driver then tap the truck — change truck statuses (ON / OFF-BD / OFF-ND …), live availability % per region/block. Moves are transactional server-side (two dispatchers can't double-assign a driver) and the board quietly re-syncs every minute. Days **roll forward** from each truck's default driver; the first edit saves the whole day as reportable history. The **Fleet doctor** rail flags needs-cover, on-leave-but-rostered, double-assigned drivers, breakdowns and trucks with no default driver. |
| **Week ahead** | `/fleet/week` — cover planning per depot × day for the coming week: trucks on road, who's short, leave counts, public-holiday markers. Unsaved days roll forward, so Thursday's hole shows up on Monday. |
| **Driver leave** | `/fleet/leave` — month grid per depot × driver; book directly or submit as a request; AL balance shown inline; depot-stretch (≥30 % off) and fleet spare-buffer alerts. Approved leave drops the driver off their truck on the board. |
| **Compliance** | `/fleet/compliance` — licences, medicals and inductions per driver with expiry tracking. An expired "block" credential (e.g. HC licence) refuses to roster the driver; everything else flags in the Fleet doctor, which also watches consecutive-days-worked fatigue runs. Credential types are data, editable in Setup. |
| **Import allocations** | `/fleet/import` — upload the daily Syncrotess allocation PDF: rows are matched against the real fleet (trucks by code, drivers by employee number or name), you review what matched, then start times and driver placements apply to the board in one audited transaction. Unknown trucks and duplicates are flagged, never guessed. |
| **Approvals** | `/approvals` — driver leave requests with depot-stretch impact warnings, bulk approve and a 30-day decision history. |
| **My roster** | `/me` — the driver's own phone-sized view: today's truck, start time and work plant, the next two weeks, their leave with AL remaining, and ticket/medical expiry countdowns. Read-only; a supervisor links the sign-in on the Drivers screen. |
| **Fleet reports** | `/fleet/reports` — leave taken (with AL balances), truck utilisation and daily availability over captured days; CSV export, print/PDF, plus a payroll timesheet CSV (saved days only — roster evidence, never computed pay). |
| **Fleet intelligence** | `/fleet/intelligence` — what the saved history says: least-reliable trucks by breakdown rate (the maintenance argument, evidenced), availability trend, and plan-vs-actual churn showing how often trucks run with someone other than their default driver. |
| **BI feed** | `/api/bi/<dataset>` — read-only JSON/CSV for Power BI behind a bearer token (`BI_API_TOKEN`, off by default). Datasets: assignments, availability, reliability, leave, plan-vs-actual. Roster facts only. |
| **Fleet wallboard** | `/wallboard/fleet` — dark TV board for the dispatch office: today's trucks by block, needs-cover in red, statuses, on-leave list, PH banner, minute auto-refresh. |
| **Fleet admin** | `/fleet/drivers` · `/fleet/trucks` · `/fleet/depots` — drivers, trucks (home depot, operating region/block, default driver) and the region→depot structure, all data-driven. |
| **Setup** | Leave types and public holidays — all editable, nothing hardcoded. |
| **Activity** | Append-only audit trail of every change — who, what, when. |
| **⌘K palette** | Jump to any page or driver from anywhere. |
| **Notifications** | In-app bell: leave requested/decided. |

## Architecture (the three seams)

1. **Schema** — `prisma/schema.prisma` is the production schema. SQLite for the
   demo; change the provider to `sqlserver` + connection string for Azure SQL.
2. **Auth** — `lib/auth/index.ts` is the only module that knows who is signed
   in, and switching it is now configuration, not code: `AUTH_MODE=demo`
   (cookie + role switcher) or `AUTH_MODE=entra` (Microsoft Entra ID
   sign-in — OIDC + PKCE, signed session cookie, JIT user provisioning,
   roles from Entra app roles; see `deploy/README.md`). Supervisors can be
   scoped to specific depots (`UserDepotScope`), enforced on every write.
   All role checks stay identical in both modes.
3. **Data access** — every query goes through `lib/db/repositories/*` via the
   single client in `lib/db/client.ts`.

These are the same three seams as H-Crew, so re-merging the fleet module back
into the combined site later is a copy, not a rewrite.

## Boundaries

Workday owns driver master data, pay, leave balances and formal leave
applications. H-Fleet is a **rostering tool**: it never computes pay or
balances, and it stands alone — any Workday feed is an optional future bonus
via the data seam, never a dependency.

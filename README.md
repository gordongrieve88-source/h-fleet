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
npm run demo     # applies migrations, seeds the real fleet data, starts the dev server
npm test         # unit + repository tests (Vitest); CI runs these on every push
```

Open http://localhost:3002 (H-Fleet runs on **port 3002**; H-Crew owns 3001).
You start signed in as view-only Staff — use the switcher at the bottom of the
sidebar to view as a Supervisor or Manager (Gordon Grieve = full access).

## What's in the box

| Area | What it does |
| --- | --- |
| **Fleet board** | `/fleet` — the daily truck board: drag a driver between trucks (or in from the spare rail) to move/swap — on touch screens, tap the driver then tap the truck — change truck statuses (ON / OFF-BD / OFF-ND …), live availability % per region/block. Moves are transactional server-side (two dispatchers can't double-assign a driver) and the board quietly re-syncs every minute. Days **roll forward** from each truck's default driver; the first edit saves the whole day as reportable history. The **Fleet doctor** rail flags needs-cover, on-leave-but-rostered, double-assigned drivers, breakdowns and trucks with no default driver. |
| **Driver leave** | `/fleet/leave` — month grid per depot × driver; book directly or submit as a request; AL balance shown inline; depot-stretch (≥30 % off) and fleet spare-buffer alerts. Approved leave drops the driver off their truck on the board. |
| **Approvals** | `/approvals` — driver leave requests with depot-stretch impact warnings, bulk approve and a 30-day decision history. |
| **Fleet reports** | `/fleet/reports` — leave taken (with AL balances), truck utilisation and daily availability over captured days; CSV export, print/PDF. |
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

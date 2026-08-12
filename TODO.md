# H-Fleet — where it stands and what's next

**As at 9 Aug 2026** · branch `claude/status-update-ht08wn` · head `d24485f` (22 commits ahead of `main`)
217 tests passing · lint, typecheck and build clean · CI runs all of it on every push.

---

## 1. Do these first — nobody else can

Ordered so the earliest items unblock the most.

- [ ] **Seed data for the other dispatch groups.** The five real codes are in
      (`300` SA, `301` NSW, `302` QLD, `303` VIC, `304` WA) but only 301 has depots, so the
      other four stay out of the view selector. Per depot I need: **depot name, its region,
      its dispatch group code, and its state**. Drivers and trucks can follow later — depots
      alone are enough to make the group selectable and prove the model across a border.
- [ ] **Check the dispatch group names** in `/setup`. "SA Conc", "QLD Conc" and the rest are
      guesses following the pattern of 301. Editable in place — but a rename only lives in your
      local database, so tell me the real ones and I'll put them in the seed where they survive
      a rebuild. *2 minutes.*
- [ ] **Add the 10 missing trucks** (`/fleet/trucks`). Your 08/08 Syncrotess roster lists these,
      but H-Fleet doesn't have them, so they land in "needs attention" on every import:
      `PLC2674` `PLC2694` `PLC2689` `PLC2673` `PLC2686` `PLC2690` `PLC2691` `PLC2695` `PLC2670` `PLC2678`
      *~10 minutes, and every future import goes green.*
- [ ] **Send a Syncrotess roster from a different day** (a Monday and a weekend would be ideal).
      One day's sheet is pinned as a regression test; a second confirms the parser handles
      layout variation before anyone relies on it.
- [ ] **Entra ID app registration** — the click-by-click steps are in `deploy/README.md` §8.
      Register the app, add redirect URI `https://<host>/auth/callback`, create a client secret,
      create three app roles named exactly `Manager` / `Supervisor` / `Staff`, assign your AD
      groups. Then fill the `ENTRA_*` fields and `SESSION_SECRET` in the config file. *~15 min.*
- [ ] **Provision a SQL Server staging database** so the provider switch can be rehearsed off
      the production box (`deploy/README.md` §3). Flag: Prisma migrations are provider-specific,
      so the existing SQLite migration folder needs handling — worth discovering in staging.
- [ ] **Confirm the hosting decision** is RHEL8 + nginx + SQL Server (the deploy kit and README
      now say so). If it's actually Azure App Service, say — same seams, different runbook.
- [ ] **Backups**: agree the SQL Server backup schedule with the DBAs and *test a restore once*.
      Untested backups aren't backups.
- [ ] **Pen test / privacy sign-off**. Driver rosters are employee personal information under
      the Privacy Act. The app-side controls (SSO, roles, depot scoping, audit trail, security
      headers) are in place to be assessed against.

### To make the integrations real

- [ ] **Workday CSV drop** — the fastest genuine integration, no API project needed. Ask HR to
      schedule two report exports to a file share, then point `WORKDAY_PEOPLE_CSV` and
      `WORKDAY_BALANCES_CSV` at them and set `PEOPLE_PROVIDER=csv`.
      Columns wanted: `employee_no, name, depot, workgroup, active` and
      `employee_no, leave_type, year, entitled_days, opening_balance`.
- [ ] **Telematics API docs** (EROAD / MTData / whoever). Send me the vendor's endpoint docs and
      a sample response and I'll pin the field mapping the same way I pinned the Syncrotess
      parser. Until then the HTTP adapter reads field aliases on a best guess.

### Before anyone treats data as real

- [ ] **Turn the sample providers off** (`PEOPLE_PROVIDER=off`, `TELEMATICS_PROVIDER=off`) once
      the demo is done. They generate clearly-labelled demonstration data — safe to show, not
      safe to decide on.
- [ ] **Put App Service authentication in front of the Azure demo** before sharing the link
      (`deploy/AZURE.md`). The demo sign-in switcher is a dropdown, not authentication — anyone
      with the URL is a Manager. Restricting it to the company tenant is five minutes in the
      portal and needs no code. The data there is invented, so this is about not leaving an
      open door, not about exposure.

---

## 2. Ready to build — say the word

- [ ] **Shift patterns and roster cycles** — the one genuinely unfinished piece of the rostering
      model. Recurring rotations generalising today's "default driver", and proper weekend /
      Sunday operating rules. Schema-level change; deserves its own pass.
- [ ] **Scope credentials by region, not just state.** Today a credential applies to a list of
      states. If a ticket is specific to, say, Metro but not Regional NSW, that needs the region
      (or the dispatch group) in the scope rule too. Small change to `appliesInState`.
- [ ] **Scope leave types by state** the same way credentials now are — public holidays already
      carry states, leave types don't. Matters once a second state is live.
- [ ] **Auto-ingest the Syncrotess PDF** — a watched mailbox or folder feeding the existing
      parser, so nobody uploads by hand each morning.
- [ ] **Hours-based fatigue** — once telematics actuals flow, replace the current
      consecutive-days guardrail with real work/rest hours against NHVR rules. *Depends on the
      telematics feed being live.*
- [ ] **Driver push / SMS notifications** — the in-app bell already notifies drivers when their
      leave is decided; adding a channel is a small extension of the notification seam.
- [ ] **Demand-driven cover forecasting** — "trucks needed per depot" from plant volumes.
- [ ] **Re-merge with H-Crew** as the combined site. The three seams (schema, auth, data access)
      were kept clean for exactly this; it's a decision about timing, not a rewrite.

---

## 3. Known rough edges (honest list)

- The **leave planner** enforces depot scoping on the server but doesn't yet grey out
  out-of-scope drivers in the UI — a scoped supervisor gets a clear "outside your access"
  error rather than a disabled control. Cosmetic, worth a polish pass.
- **Fatigue flags count days, not hours.** Deliberately described that way in the UI and code —
  it is a rostering guardrail, *not* an NHVR work/rest determination. Don't let it be presented
  as compliance certification until the hours work is done.
- **Telematics HTTP field mapping is a best guess** until vendor docs arrive (see above).
- **Site inductions are informational only.** The board knows which *plant* a truck works from,
  not which customer job site it's delivering to, so an induction tick box can't gate rostering
  the way a truck-type sign-off does. It shows on the profile and in the Fleet doctor; it can't
  refuse an allocation. Making it enforceable needs job-site data H-Fleet doesn't have.
- **Credential state scoping fails open by design.** `appliesInState` treats an empty or
  unparseable state list as "applies everywhere" (`lib/wfm/compliance.ts`). A malformed scope
  therefore over-warns rather than silently hiding a licence requirement. Keep it that way.
- **Dispatch group filtering is a view, not a permission.** Selecting 301 narrows what you see;
  it does not narrow what you can change, and an edit still writes the whole day. Depot scoping
  (`lib/auth/scope.ts`) is the permission boundary — there's a test asserting the difference.
- Three lint warnings remain (`<img>` vs `next/image`, a custom font link). Cosmetic, not errors.

---

## 4. Demoing it

```bash
npm install
npm run demo          # generate + migrate + seed the real fleet, start on http://localhost:3002
```

Run `npm install && npm run demo` after every `git pull`, not `npm run dev` — neither
`node_modules` nor the generated Prisma client is in git, so a bare `dev` misses new
dependencies (`Module not found`) and new tables (failed queries).

Sign in is the switcher at the bottom of the sidebar. **Gordon Grieve = Manager (full access)**;
there's also a scoped supervisor (Greenacre + Prestons only) and a linked driver account that
shows the self-service view.

To demo the integrations, start it with the sample feeds on:

```bash
PEOPLE_PROVIDER=sample TELEMATICS_PROVIDER=sample npm run dev
```

**A five-minute run-through that lands well:**

1. `/fleet` — the daily board. Drag a driver between trucks, or tap-then-tap on a tablet.
2. `/fleet/import` — upload the Syncrotess PDF; show the preview flagging unknown trucks before
   anything is applied.
3. `/fleet/week` — where next Thursday is short, visible today.
4. `/fleet/compliance` — try to roster the driver with the expired HC licence; it refuses and
   says why.
5. `/fleet/drivers` → open a driver → **Qualifications** — the tick boxes: mixes trained on,
   truck types signed off, site inductions. Untick a truck-type sign-off and that driver can no
   longer be put on that kind of truck.
6. `/setup` — show that credentials and dispatch groups are *data*: add one, scope it to states,
   remove it. Nothing on that screen required a developer.
7. `/integrations` — preview the HR feed, then sync; pull telematics actuals for yesterday.
8. `/fleet/intelligence` — on-time departures, least-reliable trucks, plan vs actual.

**Say this out loud in the demo:** anything produced by a sample provider is labelled *Sample
data* on screen and stamped `[SAMPLE DATA]` in the audit trail permanently. That's deliberate —
a demo that could be mistaken for live vendor data is worse than no demo.

---

## 5. What was built (for the management summary)

| Area | State |
| --- | --- |
| Daily board | Transaction-safe, works on tablets, auto-refreshes between dispatchers |
| Week ahead | Cover per depot per day, projections included |
| Syncrotess import | Pinned to your real roster format; start times + cross-plant locations |
| Compliance | Licences/medicals/inductions; expired "block" credential refuses rostering |
| Competencies | Tick boxes per driver — mixes, truck-type sign-offs, site inductions. A missing truck-type sign-off refuses the allocation |
| Multi-state | Credentials scope to states, depots carry a state, so a NSW-only ticket doesn't follow the fleet interstate |
| Dispatch groups | The allocation system's grouping (300 SA / 301 NSW / 302 QLD / 303 VIC / 304 WA); one selector narrows every screen to a group |
| Driver self-service | `/me` — own roster, leave, ticket expiries, phone-sized |
| Payroll | Timesheet CSV from saved days (roster evidence; never computes pay) |
| Intelligence | Reliability, availability trend, plan-vs-actual, on-time departures |
| Sign-in | Microsoft Entra ID via config switch; per-depot supervisor scoping |
| Integrations | HR + telematics behind one seam; CSV/HTTP/sample providers |
| BI | Power BI feed at `/api/bi/*`, token-gated, off by default |
| Ops | Health endpoint, security headers, backup + monitoring runbooks, CI |

**Boundaries held throughout:** H-Fleet never computes pay or leave balances, never writes back
to Workday, and every automated data change is previewed before it lands and audited after.

---

## 6. Picking this up in VS Code

```bash
git fetch origin
git checkout claude/status-update-ht08wn     # all the work is here, main is 22 commits behind
npm install && npm run demo
```

Opening the folder in VS Code starts the dev server by itself (`.vscode/tasks.json`) — allow the
task the first time and localhost:3002 is just up. Next hot-reloads on save, so the terminal is
not part of the edit loop. `Cmd+Shift+P` → *Run Task* has the other two: rebuild demo data, and
the three checks CI runs.

**Where things live**

| Folder | What's in it |
| --- | --- |
| `app/(app)/<screen>/` | `page.tsx` is the screen, `actions.ts` its server actions |
| `components/fleet/` | The interactive pieces — `FleetBoard.tsx`, `DepotsAdmin.tsx` |
| `lib/db/repositories/` | Every database query. Nothing else talks to the database |
| `lib/wfm/` | Pure date / leave / compliance logic — best-tested, easiest to start in |
| `lib/fleet/view-group.ts` | The dispatch-group view filter (cookie-backed) |
| `prisma/schema.prisma` | The data model — changes need `npx prisma migrate dev --name …` |
| `prisma/seed.ts` | Demo data, including the dispatch groups |

**Worth knowing before changing anything**

- `npm run demo` **wipes and rebuilds** the local database. Anything you changed through the UI —
  renamed dispatch groups, board edits — is gone. Use `npm run dev` once you're set up.
- Adding a table means updating `wipeData()` in `test/db.ts` too, or unrelated tests start
  failing on unique constraints. Caught this three times the hard way.
- This is **Next.js 16**: middleware is `proxy.ts` at the root, not `middleware.ts`. Read
  `node_modules/next/dist/docs/` before trusting anything remembered about older Next.
- Read §3 above before touching compliance or dispatch groups — several behaviours look like
  bugs and are deliberate.

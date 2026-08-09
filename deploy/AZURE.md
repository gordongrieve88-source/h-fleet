# H-Fleet demo on Azure App Service

A reachable demo instance, for showing people the app without giving them a
laptop. **Invented drivers, not real ones** — see "The data" below, it's the
part that matters.

This is not the production runbook. Production is RHEL8 + SQL Server + Entra
sign-in, and lives in [`deploy/README.md`](README.md). The two can co-exist;
this one is a shop window.

---

## The data

The seed's 194 drivers are real employees. Their names, employee numbers,
leave, credentials and competencies are personal information under the Privacy
Act, and a URL on the public internet is not the place for them.

So the demo instance runs with `SEED_ANONYMISE=1`. The seed then builds the
same fleet — same 13 depots, same 148 trucks, same headcount, same leave
patterns, same shape on every screen — staffed by invented people with
synthetic employee numbers that match nothing in Workday.
(`prisma/seed-data/anonymise.ts`; asserted by `lib/wfm/anonymise.test.ts`.)

**`startup.sh` refuses to seed if `SEED_ANONYMISE` isn't `1`.** That's on
purpose. A misconfigured demo should fail to start, not quietly publish a
staff list.

Two things this does *not* solve, worth knowing before you send the link out:

- The **source file** with the real names (`prisma/seed-data/fleet-data.ts`) is
  still in the repo, so it's still on the Web App's disk. It isn't reachable
  over HTTP — Next only serves `.next` and `public/` — but it is there. If that
  matters for your risk appetite, say and I'll strip it from the deployed
  artifact.
- Anyone with the URL is a **Manager**. The demo sign-in switcher is a
  dropdown, not authentication. Fix that with App Service authentication
  (below) — five minutes, no code.

---

## One-time setup

### 1. Create the Web App

Azure portal → **Create a resource** → **Web App**.

| Setting | Value |
| --- | --- |
| Publish | Code |
| Runtime stack | **Node 22 LTS** |
| Operating System | **Linux** |
| Region | Australia East |
| Pricing plan | B1 is enough. F1 (free) works but sleeps and has a 60-min/day CPU quota |

Node 22 matters: `better-sqlite3` is a native module compiled during CI, and a
different Node major won't load it.

### 2. Configuration → Environment variables

| Name | Value | Why |
| --- | --- | --- |
| `SEED_ANONYMISE` | `1` | **Required.** Without it the app refuses to seed |
| `WEBSITES_PORT` | `8080` | Tells App Service where to route |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | The build already happened in CI |
| `PEOPLE_PROVIDER` | `sample` | Optional — makes `/integrations` demonstrable |
| `TELEMATICS_PROVIDER` | `sample` | Optional — same |

Leave `DATABASE_URL` unset. `startup.sh` points it at `/home/data/hfleet.db`,
the one path App Service keeps across restarts and redeploys.

### 3. Configuration → General settings

**Startup Command**:

```
bash deploy/azure/startup.sh
```

### 4. GitHub → the deploy credentials

In the portal, on the Web App: **Download publish profile**. Then in GitHub →
repo **Settings** → **Secrets and variables** → **Actions**:

- **Variables** tab → New variable → `AZURE_WEBAPP_NAME` → your web app's name
- **Secrets** tab → New secret → `AZURE_WEBAPP_PUBLISH_PROFILE` → paste the
  entire downloaded file, XML and all

### 5. Deploy

GitHub → **Actions** → **Deploy demo to Azure** → **Run workflow**.

It runs lint, typecheck and the full test suite before it will deploy, builds,
then uploads. First boot takes a couple of minutes while it migrates and seeds;
watch **Log stream** in the portal.

Then open `https://<your-app>.azurewebsites.net/fleet`.

---

## Locking it down (recommended before you share the link)

Web App → **Settings** → **Authentication** → **Add identity provider** →
**Microsoft** → restrict to your tenant. App Service handles the sign-in before
a request ever reaches the app, so only people in the company can open it. No
code change — H-Fleet's own demo switcher still runs behind it and decides
which *role* you're viewing as.

This is not the same thing as the real Entra integration (`deploy/README.md`
§8), which maps AD groups onto Manager/Supervisor/Staff inside the app. This
just puts a company-only door in front of the demo.

---

## Running it

**Reset the demo** — back to a clean seeded fleet:

Web App → **Development Tools** → **SSH**, then:

```bash
rm -f /home/data/hfleet.db*
```

Restart the app. It re-migrates and re-seeds on boot.

**Update it** — push to the branch, then run the workflow again. The database
in `/home/data` survives, so anything demonstrated stays put. If a deploy
includes a schema change, `prisma migrate deploy` applies it on the next boot.

**When something's wrong** — **Log stream** shows the startup script's output.
The first line tells you which database it's using, and the seed prints in
capitals whether it used real or invented people.

---

## What this instance is not

- **Not production.** SQLite on a single instance; don't scale it out, and
  don't put real rosters in it.
- **Not authenticated** until you add App Service authentication.
- **Not a privacy sign-off.** It sidesteps the question by carrying no real
  personal information — it doesn't answer it. Real data still needs the
  assessment in `TODO.md` §1.

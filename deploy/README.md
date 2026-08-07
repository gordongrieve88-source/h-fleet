# Deploying H-Fleet on RHEL 8 (nginx + SQL Server)

Target: a RHEL8 web server running the app as a systemd service behind an
nginx reverse proxy, with data in SQL Server. **No ODBC driver is needed** —
Prisma connects to SQL Server natively; the connection details that would
live in an ODBC record go in the stored config file instead.

## 1. Server packages

```bash
sudo dnf module install nodejs:20
sudo dnf install nginx git
```

## 2. App user and code

```bash
sudo useradd --system --home /opt/h-fleet hfleet
sudo git clone <repo-url> /opt/h-fleet
cd /opt/h-fleet
```

## 3. Switch the app to SQL Server (one-time, committed)

1. `prisma/schema.prisma` → change `provider = "sqlite"` to `"sqlserver"`.
2. `npm install @prisma/adapter-mssql` and in `lib/db/client.ts` swap
   `PrismaBetterSqlite3` for the mssql adapter (the comment in that file
   marks the exact lines).
3. Regenerate migrations for SQL Server: with the config file pointing at a
   dev/staging database, run `npx prisma migrate dev -n init_sqlserver`
   once and commit the new migration folder.

## 4. Stored config file (connection details)

```bash
sudo mkdir /etc/h-fleet
sudo cp deploy/h-fleet.env.example /etc/h-fleet/h-fleet.env
sudo chown root:hfleet /etc/h-fleet/h-fleet.env
sudo chmod 0640 /etc/h-fleet/h-fleet.env
sudoedit /etc/h-fleet/h-fleet.env     # <- enter the SQL Server details here
```

The fields (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
`DB_ENCRYPT`, `DB_TRUST_SERVER_CERTIFICATE`) map one-to-one onto an ODBC
record. Re-enter details any time with `sudoedit` + `systemctl restart h-fleet`.

## 5. Build, migrate, seed reference data

```bash
cd /opt/h-fleet
sudo -u hfleet npm ci
set -a; source /etc/h-fleet/h-fleet.env; set +a
npx prisma migrate deploy        # creates the schema in SQL Server
npx tsx prisma/seed.ts           # optional: demo/reference data
sudo -u hfleet npm run build
```

## 6. systemd service

```bash
sudo cp deploy/h-fleet.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now h-fleet
systemctl status h-fleet
```

## 7. nginx reverse proxy

```bash
sudo cp deploy/nginx-h-fleet.conf /etc/nginx/conf.d/h-fleet.conf
sudoedit /etc/nginx/conf.d/h-fleet.conf      # set server_name
sudo setsebool -P httpd_can_network_connect 1   # SELinux: allow proxying
sudo nginx -t && sudo systemctl enable --now nginx
sudo firewall-cmd --permanent --add-service=http --add-service=https
sudo firewall-cmd --reload
```

TLS: `sudo dnf install certbot python3-certbot-nginx && sudo certbot --nginx`.

## 8. Sign-in (Microsoft Entra ID)

Corporate SSO is configuration, not a code change — set `AUTH_MODE=entra`
in the stored config file and fill in the `ENTRA_*` / `SESSION_SECRET`
fields. One-time setup in the Azure portal (**App registrations**):

1. **Register an app** — e.g. "H-Fleet". Redirect URI (type *Web*):
   `https://<your-host>/auth/callback` — must match `ENTRA_REDIRECT_URI`
   exactly.
2. **Certificates & secrets** → new client secret → `ENTRA_CLIENT_SECRET`.
   (Diary the expiry — rotating it is editing the config file + restart.)
3. **App roles** → create three roles whose *values* are exactly
   `Manager`, `Supervisor`, `Staff`, assignable to users/groups.
4. **Enterprise application** → assign your AD users/groups to those roles.
   The token's roles claim then drives `AppUser.role` on every sign-in;
   accounts with no role claim keep their app-assigned role (new ones start
   as view-only Staff).
5. Overview page → copy the **Directory (tenant) ID** and **Application
   (client) ID** into the config file, generate `SESSION_SECRET`
   (`openssl rand -base64 48`), then `sudo systemctl restart h-fleet`.

Notes:
- First sign-in auto-provisions the AppUser (matched to a pre-created
  account by email if one exists) and records it in the Activity feed.
- Deactivating someone in H-Fleet blocks them even while their Entra
  account is still live — and vice versa, disabling in Entra stops new
  sign-ins at the door.
- Wallboard TVs skip SSO with `WALLBOARD_TOKEN` (see the config file
  comments). Rotate the token to revoke every TV at once.
- Depot-scoped supervisors: rows in the `UserDepotScope` table limit a
  SUPERVISOR to specific depots (no rows = unrestricted).

## 9. Backups

The database is the only state — the app tree is reproducible from git.

- **SQL Server**: use your DBA's normal full+log backup schedule; H-Fleet
  needs nothing special. Point-in-time restore is the target (RPO ≤ 1h is
  comfortable for a rostering tool; the spreadsheet era had none).
- **Local/demo SQLite**: `sqlite3 prisma/dev.db ".backup backup.db"`.
- After any restore: `systemctl restart h-fleet` and check `/api/health`.

## 10. Monitoring

- `GET /api/health` → `{"ok":true,"db":"up"}` (200) or 503 — wire this
  into your uptime monitor; it exercises the app AND the database.
- `journalctl -u h-fleet -f` — app logs (systemd captures stdout).
- The systemd unit restarts the app on crash; nginx returns 502 while it
  comes back, which your monitor will catch via /api/health.

## Troubleshooting

- `journalctl -u h-fleet -f` — app logs.
- 502 from nginx but app runs → almost always the SELinux boolean in step 7.
- Connection refused to SQL Server → check `DB_ENCRYPT` /
  `DB_TRUST_SERVER_CERTIFICATE` against how the server's TLS is set up, and
  that port 1433 is reachable (`nc -vz $DB_HOST 1433`).
- Redirect loop on sign-in → `ENTRA_REDIRECT_URI` doesn't match the app
  registration, or the TLS-terminating proxy isn't passing
  `X-Forwarded-Proto https`.
- "Sign-in failed" page → `journalctl -u h-fleet` has the underlying
  openid-client error (clock skew, bad secret, consent not granted).

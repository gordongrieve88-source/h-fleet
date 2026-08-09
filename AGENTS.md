<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# H-Fleet — project context

Standalone daily truck/driver rostering board (194 drivers, 148 trucks, 13
depots — replaces the HMA Metro Roster spreadsheet). Split out of the
**H-Crew** rostering app (`~/Projects/h-crew`) on 2026-06-10; it is intended
to plug back into that site as an extension later, so keep the seams clean —
own schema, own LeaveType list, own approvals queue. Do not re-couple the two
projects or copy code between them without being asked.

- Stack: Next.js 16, Prisma 7 + local SQLite (`prisma/dev.db`), Tailwind 4.
- Dev server: `npm run dev` (pinned to port 3002; if 3002 is taken — often by
  LoungeIQ — use another port). `npm run demo` = generate + migrate + seed +
  dev. After a pull run `npm install && npm run demo`: neither `node_modules`
  nor `generated/` is committed, so bare `npm run dev` misses new dependencies
  (`Module not found`) and new schema (queries on the new model throw).
- Demo auth: cookie `hfleet_user_id` holding an AppUser id (h-crew uses a
  different cookie; they coexist on localhost). User id 1 = Gordon Grieve,
  MANAGER (full access).
- Routes: `/fleet` (board + Fleet doctor), `/fleet/leave`, `/fleet/reports`,
  `/fleet/{drivers,trucks,depots}`, `/approvals`, `/activity`, `/setup`,
  `/wallboard/fleet` (depot TV).

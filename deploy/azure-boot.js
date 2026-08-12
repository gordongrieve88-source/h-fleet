/* eslint-disable @typescript-eslint/no-require-imports -- plain Node boot script, CommonJS on purpose */
// First boot on a fresh persistent volume: copy the seeded database that
// shipped inside the bundle to the persistent path (DATABASE_URL under
// /home/data), then hand over to the server. On every later boot — and
// every later DEPLOY — the persistent file already exists and is left
// alone, so shipping code no longer resets the demo's data. To reseed on
// purpose, delete the file under /home/data and restart.
const fs = require("node:fs");
const path = require("node:path");

const url = process.env.DATABASE_URL ?? "";
const target = url.startsWith("file:") ? url.slice("file:".length) : null;
if (target) {
  const bundled = ["dev.db", "demo.db"]
    .map((n) => path.join(__dirname, "prisma", n))
    .find((p) => fs.existsSync(p));
  if (!fs.existsSync(target) && bundled) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(bundled, target);
    console.log(`Persistent database initialised at ${target} from ${path.basename(bundled)}`);
  } else {
    console.log(`Persistent database in place at ${target} — bundle's seed ignored`);
  }
}
require("./server.js");

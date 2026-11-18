/* Vercel build: generate the Prisma client, sync the DB schema when a
   PostgreSQL DATABASE_URL is configured, then build Next.js.
   `prisma db push` runs WITHOUT --accept-data-loss, so a destructive schema
   change fails the build instead of silently dropping data. */
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

/* Neon via Vercel provides DATABASE_URL (pooled) + DATABASE_URL_UNPOOLED (direct). */
process.env.DATABASE_URL_UNPOOLED ||= process.env.DATABASE_URL || "";

run("npx prisma generate");

const url = process.env.DATABASE_URL || "";
if (/^postgres(ql)?:\/\//.test(url)) {
  console.log("› Syncing database schema (prisma db push)…");
  run("npx prisma db push --skip-generate");
} else {
  console.warn("⚠ DATABASE_URL is not a PostgreSQL URL — skipping schema sync. The store will use the static catalogue and the admin will be unavailable.");
}

run("npm run build");

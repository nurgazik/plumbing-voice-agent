// Apply any migration in supabase/migrations that has not been applied yet.
//
//   node supabase/apply.js            apply pending migrations
//   node supabase/apply.js --status   list applied and pending, change nothing
//
// Uses the Supabase management API with SUPABASE_ACCESS_TOKEN from .env, so no
// database password and no CLI install. Applied versions are recorded in the same
// table the Supabase CLI uses (supabase_migrations.schema_migrations), so the CLI
// can take over later without confusion. Files run in name order; name them
// YYYYMMDD_NNNN_description.sql.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(__dirname, "migrations");
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
    .filter((m) => m && !m[0].trim().startsWith("#"))
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")])
);
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
const token = env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error("SUPABASE_ACCESS_TOKEN missing from .env");

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : [];
}

async function main() {
  const statusOnly = process.argv.includes("--status");
  await sql(`create schema if not exists supabase_migrations;
             create table if not exists supabase_migrations.schema_migrations (
               version text primary key, statements text[], name text);`);
  const applied = new Set((await sql("select version from supabase_migrations.schema_migrations")).map((r) => r.version));
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const version = f.replace(/\.sql$/, "");
    if (applied.has(version)) { console.log(`applied  ${f}`); continue; }
    if (statusOnly) { console.log(`pending  ${f}`); continue; }
    const body = fs.readFileSync(path.join(DIR, f), "utf8");
    await sql(body);
    await sql(`insert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${f}')`);
    console.log(`applied  ${f}  (just now)`);
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });

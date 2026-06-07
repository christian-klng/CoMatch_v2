// Minimal forward-only migration runner.
// Applies every .sql file in ../migrations once, tracked in _migrations.
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function run() {
  await pool.query(`create table if not exists _migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);

  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const done = await pool.query("select 1 from _migrations where name = $1", [file]);
    if (done.rowCount) {
      console.log(`skip   ${file}`);
      continue;
    }
    const sql = await readFile(join(dir, file), "utf8");
    console.log(`apply  ${file}`);
    await pool.query("begin");
    try {
      await pool.query(sql);
      await pool.query("insert into _migrations(name) values($1)", [file]);
      await pool.query("commit");
    } catch (err) {
      await pool.query("rollback");
      throw err;
    }
  }

  await pool.end();
  console.log("migrations done");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

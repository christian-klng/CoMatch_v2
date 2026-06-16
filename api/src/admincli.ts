// Create or reset an admin account. Idempotent: re-running for the same email
// updates the password (acts as a password reset).
//
//   npm run admin:create -- admin@example.com 'the-password'
//   # or via env:
//   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='the-password' npm run admin:create
//
// In production (compiled): node dist/admincli.js admin@example.com 'the-password'
import { pool } from "./db.js";
import { hashPassword } from "./adminAuth.js";

async function run() {
  const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.argv[3] ?? process.env.ADMIN_PASSWORD ?? "";

  if (!email || !email.includes("@")) {
    console.error("Usage: admin:create <email> <password>  (a valid email is required)");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const password_hash = hashPassword(password);
  const { rows } = await pool.query<{ id: string; created: boolean }>(
    `insert into admin_users (email, password_hash) values ($1, $2)
     on conflict (email) do update set password_hash = excluded.password_hash
     returning id, (xmax = 0) as created`,
    [email, password_hash],
  );

  await pool.end();
  console.log(`${rows[0].created ? "Created" : "Updated"} admin ${email} (${rows[0].id})`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

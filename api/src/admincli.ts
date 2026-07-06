// Create or reset an admin account. Idempotent: re-running for the same email
// updates the password (acts as a password reset).
//
//   npm run admin:create -- admin@example.com 'the-password'
//   npm run admin:create -- admin@example.com 'the-password' --super  # + super-admin
//   # or via env:
//   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='the-password' npm run admin:create
//
// In production (compiled): node dist/admincli.js admin@example.com 'the-password'
//
// --super promotes the account to super-admin (may manage the admin roster). It
// only ever grants super — a plain password reset never revokes it, so re-running
// without the flag is safe.
import { pool } from "./db.js";
import { hashPassword } from "./adminAuth.js";

async function run() {
  const args = process.argv.slice(2);
  const wantSuper = args.includes("--super");
  const positional = args.filter((a) => !a.startsWith("--"));
  const email = (positional[0] ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = positional[1] ?? process.env.ADMIN_PASSWORD ?? "";

  if (!email || !email.includes("@")) {
    console.error("Usage: admin:create <email> <password> [--super]  (a valid email is required)");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const password_hash = hashPassword(password);
  // On conflict, --super can promote (OR) but never auto-demotes: a bare
  // password reset keeps the existing super status intact.
  const { rows } = await pool.query<{ id: string; created: boolean; is_super_admin: boolean }>(
    `insert into admin_users (email, password_hash, is_super_admin) values ($1, $2, $3)
     on conflict (email) do update set
       password_hash = excluded.password_hash,
       is_super_admin = admin_users.is_super_admin or excluded.is_super_admin
     returning id, (xmax = 0) as created, is_super_admin`,
    [email, password_hash, wantSuper],
  );

  await pool.end();
  const suffix = rows[0].is_super_admin ? " [super-admin]" : "";
  console.log(`${rows[0].created ? "Created" : "Updated"} admin ${email} (${rows[0].id})${suffix}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

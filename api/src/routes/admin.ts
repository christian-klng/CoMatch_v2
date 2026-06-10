import { Hono } from "hono";
import { pool } from "../db.js";

// Lean community admin. NO AUTH YET — intentionally open for the single
// pre-launch operator. Lock this behind an admin role + auth before any
// public exposure (tracked as a follow-up).
export const admin = new Hono();

const COMMUNITY_COLS = `
  c.id, c.name, c.context, c.code, c.published,
  c.created_at as "createdAt",
  (select count(*)::int from community_members m where m.community_id = c.id) as "memberCount"
`;

/** Random 8-digit code; first digit 1-9 so it's always 8 chars long. */
function randomCode(): string {
  let s = String(1 + Math.floor(Math.random() * 9));
  for (let i = 0; i < 7; i++) s += Math.floor(Math.random() * 10);
  return s;
}

// GET /api/admin/communities → all communities, newest first.
admin.get("/communities", async (c) => {
  const { rows } = await pool.query(
    `select ${COMMUNITY_COLS} from communities c order by c.created_at desc`,
  );
  return c.json(rows);
});

// POST /api/admin/communities { name, context?, published? } → create with a
// freshly generated unique code.
admin.post("/communities", async (c) => {
  const body = await c.req
    .json<{ name?: string; context?: string; published?: boolean }>()
    .catch(() => ({}) as { name?: string; context?: string; published?: boolean });
  const name = body.name?.trim();
  if (!name) return c.json({ error: "name required" }, 400);
  const context = body.context?.trim() || null;
  const published = Boolean(body.published);

  // Retry on the rare code collision against the unique constraint.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      const { rows } = await pool.query(
        `with inserted as (
           insert into communities (name, context, code, published)
           values ($1, $2, $3, $4)
           returning id, name, context, code, published, created_at
         )
         select i.id, i.name, i.context, i.code, i.published,
                i.created_at as "createdAt", 0 as "memberCount"
           from inserted i`,
        [name, context, code, published],
      );
      return c.json(rows[0], 201);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "23505") continue; // code taken → retry
      throw e;
    }
  }
  return c.json({ error: "could not allocate a unique code" }, 500);
});

// PATCH /api/admin/communities/:id { name?, context?, published? }
admin.patch("/communities/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req
    .json<{ name?: string; context?: string; published?: boolean }>()
    .catch(() => ({}) as { name?: string; context?: string; published?: boolean });

  const { rows } = await pool.query(
    `update communities c set
       name = coalesce($2, c.name),
       context = coalesce($3, c.context),
       published = coalesce($4, c.published)
     where c.id = $1
     returning ${COMMUNITY_COLS}`,
    [
      id,
      body.name?.trim() ?? null,
      body.context !== undefined ? body.context.trim() || null : null,
      typeof body.published === "boolean" ? body.published : null,
    ],
  );
  if (rows.length === 0) return c.json({ error: "not_found" }, 404);
  return c.json(rows[0]);
});

// DELETE /api/admin/communities/:id
admin.delete("/communities/:id", async (c) => {
  const { rowCount } = await pool.query(`delete from communities where id = $1`, [
    c.req.param("id"),
  ]);
  if (!rowCount) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});

// ── Members ──────────────────────────────────────────────────────────────
// Test-user management for the operator. Same "no auth yet" caveat applies.

const MEMBER_COLS = `
  u.id, u.name, u.email, u.role, u.company,
  m.joined_at as "joinedAt",
  (select count(*)::int from community_members mm where mm.user_id = u.id) as "communityCount"
`;

// GET /api/admin/communities/:id/members → members of a community, newest first.
admin.get("/communities/:id/members", async (c) => {
  const { rows } = await pool.query(
    `select ${MEMBER_COLS}
       from community_members m
       join users u on u.id = m.user_id
      where m.community_id = $1
      order by m.joined_at desc`,
    [c.req.param("id")],
  );
  return c.json(rows);
});

// POST /api/admin/communities/:id/members { name, role?, email?, company? }
// → create a user and add them to this community. For quickly seeding test data.
admin.post("/communities/:id/members", async (c) => {
  const communityId = c.req.param("id");
  const exists = await pool.query(`select 1 from communities where id = $1`, [communityId]);
  if (exists.rows.length === 0) return c.json({ error: "not_found" }, 404);

  const body = await c.req
    .json<{ name?: string; role?: string; email?: string; company?: string }>()
    .catch(() => ({}) as { name?: string; role?: string; email?: string; company?: string });
  const name = body.name?.trim();
  if (!name) return c.json({ error: "name required" }, 400);
  const role = body.role?.trim() || "Testnutzer";
  const email = body.email?.trim() || null;
  const company = body.company?.trim() || null;

  const user = await pool.query(
    `insert into users (name, role, email, company)
     values ($1, $2, $3, $4)
     returning id`,
    [name, role, email, company],
  );
  await pool.query(
    `insert into community_members (community_id, user_id) values ($1, $2)
     on conflict do nothing`,
    [communityId, user.rows[0].id],
  );

  const { rows } = await pool.query(
    `select ${MEMBER_COLS}
       from community_members m
       join users u on u.id = m.user_id
      where m.community_id = $1 and u.id = $2`,
    [communityId, user.rows[0].id],
  );
  return c.json(rows[0], 201);
});

const SEED_FIRST = ["Anna", "Ben", "Clara", "David", "Emma", "Felix", "Greta", "Hannes",
  "Ida", "Jonas", "Klara", "Leon", "Mara", "Noah", "Olivia", "Paul"];
const SEED_LAST = ["Bauer", "Fischer", "Hoffmann", "Krause", "Lang", "Meyer",
  "Richter", "Schmidt", "Weber", "Wolf"];
const SEED_ROLE = ["Designer", "Developer", "Founder", "PM", "Marketing", "Sales",
  "Data Scientist", "Student"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// POST /api/admin/communities/:id/members/seed { count? } → create N random
// test users and add them to this community. Defaults to 5.
admin.post("/communities/:id/members/seed", async (c) => {
  const communityId = c.req.param("id");
  const exists = await pool.query(`select 1 from communities where id = $1`, [communityId]);
  if (exists.rows.length === 0) return c.json({ error: "not_found" }, 404);

  const body = await c.req.json<{ count?: number }>().catch(() => ({}) as { count?: number });
  const count = Math.min(Math.max(Math.floor(body.count ?? 5), 1), 25);

  for (let i = 0; i < count; i++) {
    const first = pick(SEED_FIRST);
    const last = pick(SEED_LAST);
    const tag = randomCode().slice(0, 4);
    const user = await pool.query(
      `insert into users (name, role, email, company)
       values ($1, $2, $3, $4) returning id`,
      [
        `${first} ${last}`,
        pick(SEED_ROLE),
        `${first.toLowerCase()}.${last.toLowerCase()}.${tag}@test.comatch`,
        pick(["Acme", "Globex", "Initech", "Umbrella", "Hooli", null]),
      ],
    );
    await pool.query(
      `insert into community_members (community_id, user_id) values ($1, $2)
       on conflict do nothing`,
      [communityId, user.rows[0].id],
    );
  }

  const { rows } = await pool.query(
    `select ${MEMBER_COLS}
       from community_members m
       join users u on u.id = m.user_id
      where m.community_id = $1
      order by m.joined_at desc`,
    [communityId],
  );
  return c.json(rows);
});

// DELETE /api/admin/communities/:id/members/:userId → delete the user entirely
// (cascades to all memberships/skills/connections). The test-data cleanup path.
admin.delete("/communities/:id/members/:userId", async (c) => {
  const { rowCount } = await pool.query(`delete from users where id = $1`, [
    c.req.param("userId"),
  ]);
  if (!rowCount) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});

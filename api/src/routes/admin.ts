import { Hono } from "hono";
import { pool } from "../db.js";
import { mistralConfigured, translateSkillLabels } from "../mistral.js";

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

// ── Users ────────────────────────────────────────────────────────────────

// GET /api/admin/users?q=… → search by email or name (max 100)
admin.get("/users", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const { rows } = await pool.query(
    `select u.id, u.email, u.name, u.role, u.company,
            u.linkedin_url               as "linkedinUrl",
            (u.linkedin_profile is not null) as "linkedinProfileRead",
            u.avatar_url                 as "avatarUrl",
            (u.avatar_data is not null)  as "hasAvatarData",
            (u.skill_suggestions is not null) as "hasSkillSuggestions",
            u.created_at                 as "createdAt",
            (select count(*)::int from community_members m where m.user_id = u.id)
                                         as "communityCount"
       from users u
      where $1 = '' or u.email ilike $2 or u.name ilike $2
      order by u.created_at desc
      limit 100`,
    [q, `%${q}%`],
  );
  return c.json(rows);
});

// GET /api/admin/users/:id → full detail: profile + skills + communities
admin.get("/users/:id", async (c) => {
  const id = c.req.param("id");

  const { rows } = await pool.query(
    `select u.id, u.email, u.name, u.role, u.company, u.bio,
            u.linkedin_url               as "linkedinUrl",
            u.linkedin_consent_at        as "linkedinConsentAt",
            (u.linkedin_profile is not null) as "linkedinProfileRead",
            u.avatar_url                 as "avatarUrl",
            (u.avatar_data is not null)  as "hasAvatarData",
            (u.skill_suggestions is not null) as "hasSkillSuggestions",
            u.locale,
            u.created_at                 as "createdAt"
       from users u where u.id = $1`,
    [id],
  );
  if (rows.length === 0) return c.json({ error: "not_found" }, 404);

  const skills = (
    await pool.query<{ kind: string; label: string }>(
      `select us.kind, coalesce(s.label_en, s.label) as label
         from user_skills us
         join skills s on s.id = us.skill_id
        where us.user_id = $1
        order by us.kind, s.label`,
      [id],
    )
  ).rows;

  const communities = (
    await pool.query<{ id: string; name: string }>(
      `select c.id, c.name
         from community_members m
         join communities c on c.id = m.community_id
        where m.user_id = $1
        order by c.name`,
      [id],
    )
  ).rows;

  return c.json({ ...rows[0], skills, communities });
});

// PATCH /api/admin/users/:id → overwrite editable fields; null = clear.
// clearLinkedin: true → wipes linkedin_url, linkedin_profile, avatar, skill_suggestions.
admin.patch("/users/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req
    .json<{
      name?: string | null;
      role?: string | null;
      company?: string | null;
      bio?: string | null;
      linkedinUrl?: string | null;
      clearLinkedin?: boolean;
    }>()
    .catch(() => ({}) as Record<string, unknown>);

  const trim = (v: unknown) =>
    typeof v === "string" ? v.trim() || null : v === null ? null : undefined;

  const name    = trim(body.name);
  const role    = trim(body.role);
  const company = trim(body.company);
  const bio     = trim(body.bio);
  const linkedinUrl = trim(body.linkedinUrl);

  // Build SET clauses only for fields explicitly included in the request.
  const sets: string[] = [];
  const vals: unknown[] = [id];
  const add = (col: string, val: unknown) => {
    vals.push(val);
    sets.push(`${col} = $${vals.length}`);
  };

  if (name    !== undefined) add("name",        name);
  if (role    !== undefined) add("role",         role);
  if (company !== undefined) add("company",      company);
  if (bio     !== undefined) add("bio",          bio);

  if (body.clearLinkedin) {
    sets.push(
      "linkedin_url = null",
      "linkedin_profile = null",
      "linkedin_consent_at = null",
      "avatar_data = null",
      "avatar_mime = null",
      "avatar_url = null",
      "skill_suggestions = null",
    );
  } else if (linkedinUrl !== undefined) {
    add("linkedin_url", linkedinUrl);
  }

  if (sets.length === 0) return c.json({ error: "nothing_to_update" }, 400);

  const { rowCount } = await pool.query(
    `update users set ${sets.join(", ")} where id = $1`,
    vals,
  );
  if (!rowCount) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});

// POST /api/admin/skills/translate → one-shot backfill: translate every skill
// concept that has no English label yet (batched LLM calls). Idempotent —
// rerunning only picks up whatever is still untranslated. Collisions (the
// translation already names another concept) are skipped and reported.
admin.post("/skills/translate", async (c) => {
  if (!mistralConfigured) return c.json({ error: "mistral_not_configured" }, 503);

  const { rows } = await pool.query<{ id: string; label: string }>(
    `select id, label from skills where label_en is null order by label`,
  );
  if (rows.length === 0) return c.json({ translated: 0, skipped: 0, remaining: 0 });

  let translated = 0;
  let skipped = 0;
  const BATCH = 40;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const translations = await translateSkillLabels(
      batch.map((r) => r.label),
      "en",
    );
    for (let j = 0; j < batch.length; j++) {
      try {
        const { rowCount } = await pool.query(
          `update skills set label_en = $2 where id = $1 and label_en is null`,
          [batch[j].id, translations[j]],
        );
        translated += rowCount ?? 0;
      } catch (e: unknown) {
        // Unique collision: the translation already names another concept.
        if ((e as { code?: string })?.code !== "23505") throw e;
        skipped++;
        console.warn(
          `[admin] label_en collision: "${batch[j].label}" → "${translations[j]}"`,
        );
      }
    }
  }

  const remaining = (
    await pool.query<{ n: number }>(
      `select count(*)::int as n from skills where label_en is null`,
    )
  ).rows[0].n;
  return c.json({ translated, skipped, remaining });
});

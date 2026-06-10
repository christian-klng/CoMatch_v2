import { Hono } from "hono";
import type { Context } from "hono";
import { pool } from "../db.js";
import { type AuthEnv, requireAuth } from "../auth.js";
import {
  downloadImage,
  fetchLinkedInProfile,
  linkedinIdentifier,
  unipileConfigured,
} from "../unipile.js";
import { mistralConfigured, suggestSkills, type SkillSuggestions } from "../mistral.js";

export const me = new Hono<AuthEnv>();

/** Public base URL of this API, derived from the proxy's forwarded headers so
 *  we don't need to hardcode the domain (self-configuring, no stale value). */
function apiBaseUrl(c: Context): string {
  const proto = c.req.header("x-forwarded-proto") ?? "http";
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? "";
  return `${proto}://${host}`;
}

// GET /api/me/skills → the logged-in user's seeks/offers as skill ids.
me.get("/skills", requireAuth, async (c) => {
  const { rows } = await pool.query<{ skill_id: string; kind: "seek" | "offer" }>(
    `select skill_id, kind from user_skills where user_id = $1`,
    [c.get("userId")],
  );
  return c.json({
    seeks: rows.filter((r) => r.kind === "seek").map((r) => r.skill_id),
    offers: rows.filter((r) => r.kind === "offer").map((r) => r.skill_id),
  });
});

// PUT /api/me/skills { seeks: string[], offers: string[] } → replace the user's
// skills. Only ids from the controlled catalog are stored (FK-safe); unknown
// ids are silently dropped. Custom free-text comes later (catalog v2).
me.put("/skills", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req
    .json<{ seeks?: string[]; offers?: string[] }>()
    .catch(() => ({}) as { seeks?: string[]; offers?: string[] });
  const seeks = [...new Set(body.seeks ?? [])];
  const offers = [...new Set(body.offers ?? [])];

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`delete from user_skills where user_id = $1`, [userId]);
    // Insert only ids that exist in the catalog (join filters unknowns).
    await client.query(
      `insert into user_skills (user_id, skill_id, kind)
       select $1, s.id, 'seek'
         from unnest($2::text[]) as t(id)
         join skills s on s.id = t.id
       on conflict do nothing`,
      [userId, seeks],
    );
    await client.query(
      `insert into user_skills (user_id, skill_id, kind)
       select $1, s.id, 'offer'
         from unnest($2::text[]) as t(id)
         join skills s on s.id = t.id
       on conflict do nothing`,
      [userId, offers],
    );
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }

  return c.json({ ok: true });
});

// POST /api/me/linkedin { url, consent } → save the user's LinkedIn URL (only
// with data-processing consent) and, if the URL is valid, read the profile via
// Unipile, store it, and self-host the profile picture.
me.post("/linkedin", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req
    .json<{ url?: string; consent?: boolean }>()
    .catch(() => ({}) as { url?: string; consent?: boolean });

  if (body.consent !== true) {
    return c.json({ error: "consent_required" }, 400);
  }
  const url = body.url?.trim();
  if (!url) return c.json({ error: "url_required" }, 400);

  const identifier = linkedinIdentifier(url);
  if (!identifier) return c.json({ error: "invalid_linkedin_url" }, 400);

  // Persist URL + consent immediately; the profile fetch can be retried later.
  await pool.query(
    `update users set linkedin_url = $2, linkedin_consent_at = now() where id = $1`,
    [userId, url],
  );

  if (!unipileConfigured) {
    return c.json({ ok: true, profileFetched: false, reason: "unipile_not_configured" });
  }

  try {
    const profile = await fetchLinkedInProfile(identifier);

    // Self-host the (temporary) LinkedIn picture so it doesn't expire on us.
    let avatarUrl: string | null = null;
    const picUrl = profile.profile_picture_url_large ?? profile.profile_picture_url;
    if (picUrl) {
      const img = await downloadImage(picUrl);
      if (img) {
        await pool.query(
          `update users set avatar_data = $2, avatar_mime = $3 where id = $1`,
          [userId, img.data, img.mime],
        );
        avatarUrl = `${apiBaseUrl(c)}/api/users/${userId}/avatar`;
      }
    }

    await pool.query(
      `update users set linkedin_profile = $2,
              avatar_url = coalesce($3, avatar_url)
         where id = $1`,
      [userId, profile, avatarUrl],
    );

    return c.json({ ok: true, profileFetched: true });
  } catch (err) {
    // URL + consent are saved; surface that the profile read failed so the user
    // can retry from their profile later.
    console.error("[linkedin] profile fetch failed", err);
    return c.json({ ok: true, profileFetched: false, reason: "fetch_failed" });
  }
});

// GET /api/me/skill-suggestions → the user's stored AI suggestions plus status:
//   profileReady — a LinkedIn profile has been read and can be analysed
//   generated    — suggestions have already been produced (don't regenerate)
// The Skills screen uses these to decide whether to trigger generation itself.
me.get("/skill-suggestions", requireAuth, async (c) => {
  const { rows } = await pool.query<{
    skill_suggestions: SkillSuggestions | null;
    has_profile: boolean;
  }>(
    `select skill_suggestions, (linkedin_profile is not null) as has_profile
       from users where id = $1`,
    [c.get("userId")],
  );
  const row = rows[0];
  const suggestions = row?.skill_suggestions ?? { seeks: [], offers: [] };
  return c.json({
    seeks: suggestions.seeks,
    offers: suggestions.offers,
    profileReady: Boolean(row?.has_profile),
    generated: row?.skill_suggestions != null,
  });
});

// POST /api/me/skill-suggestions → generate suggestions from the stored LinkedIn
// profile via Mistral, store them, and return them.
me.post("/skill-suggestions", requireAuth, async (c) => {
  const userId = c.get("userId");
  if (!mistralConfigured) return c.json({ error: "mistral_not_configured" }, 503);

  const { rows } = await pool.query<{ linkedin_profile: unknown }>(
    `select linkedin_profile from users where id = $1`,
    [userId],
  );
  const profile = rows[0]?.linkedin_profile;
  if (!profile) return c.json({ error: "no_profile" }, 400);

  const catalog = (
    await pool.query<{ id: string; label: string }>(`select id, label from skills`)
  ).rows;

  try {
    const suggestions = await suggestSkills(profile, catalog);
    await pool.query(`update users set skill_suggestions = $2 where id = $1`, [
      userId,
      suggestions,
    ]);
    return c.json(suggestions);
  } catch (err) {
    console.error("[skills] suggestion generation failed", err);
    return c.json({ error: "generation_failed" }, 502);
  }
});

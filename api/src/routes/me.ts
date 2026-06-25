import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { pool } from "../db.js";
import { type AuthEnv, requireAuth } from "../auth.js";
import { apiBaseUrl } from "../avatars.js";
import {
  ALLOWED_MIME,
  deleteFile,
  MAX_FILE_BYTES,
  MAX_FILES_PER_USER,
  readFileBytes,
  saveFile,
} from "../files.js";
import {
  downloadImage,
  fetchLinkedInProfile,
  linkedinIdentifier,
  unipileConfigured,
} from "../unipile.js";
import {
  extractProfileFields,
  mistralConfigured,
  type ProfileFields,
  suggestSkills,
  type SkillSuggestions,
} from "../mistral.js";
import { canonicalizeLabels } from "../skillcatalog.js";

export const me = new Hono<AuthEnv>();

// PUT /api/me/profile { name, role, company, bio, contactChannel, contactNote }
// → update the editable profile fields. Name is required (match cards rely on
// it); the other fields may be cleared by sending an empty string.
me.put("/profile", requireAuth, async (c) => {
  const body = await c.req
    .json<{
      name?: string;
      role?: string;
      company?: string;
      bio?: string;
      contactChannel?: string;
      contactNote?: string;
      attributes?: string[];
    }>()
    .catch(() => ({}) as Record<string, unknown>);

  const clean = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) || null : null;

  const name = clean(body.name, 60);
  if (!name) return c.json({ error: "name_required" }, 400);
  const role = clean(body.role, 80);
  const company = clean(body.company, 80);
  const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 500) || null : null;
  // Preferred contact channel: 'linkedin' is only honoured when a LinkedIn URL
  // is on file (guarded in SQL below); anything else falls back to 'email'.
  const contactChannel = body.contactChannel === "linkedin" ? "linkedin" : "email";
  // Free-text "about us" note used when others reach out (like bio, max 500).
  const contactNote =
    typeof body.contactNote === "string" ? body.contactNote.trim().slice(0, 500) || null : null;

  // attributes is optional: an array (even empty) replaces the tags; omit the
  // field entirely to leave them untouched. Max 3, deduped, each ≤ 40 chars.
  const attributes = Array.isArray(body.attributes)
    ? [
        ...new Set(
          body.attributes
            .filter((x): x is string => typeof x === "string")
            .map((x) => x.trim().replace(/\s+/g, " ").slice(0, 40))
            .filter(Boolean),
        ),
      ].slice(0, 3)
    : null;

  await pool.query(
    `update users set name = $2, role = $3, company = $4, bio = $5,
            contact_channel = case when $6 = 'linkedin' and linkedin_url is not null
                                   then 'linkedin' else 'email' end,
            contact_note = $7,
            attributes = case when $8::text[] is not null then $8::text[] else attributes end
       where id = $1`,
    [c.get("userId"), name, role, company, bio, contactChannel, contactNote, attributes],
  );
  return c.json({ ok: true });
});

// PUT /api/me/locale { locale } → persist the user's explicit language choice
// (used for outgoing emails; the SPA itself reads it from /auth/me).
me.put("/locale", requireAuth, async (c) => {
  const body = await c.req
    .json<{ locale?: string }>()
    .catch(() => ({}) as { locale?: string });
  if (body.locale !== "de" && body.locale !== "en") {
    return c.json({ error: "invalid_locale" }, 400);
  }
  await pool.query(`update users set locale = $2 where id = $1`, [
    c.get("userId"),
    body.locale,
  ]);
  return c.json({ ok: true });
});

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

    // Prefill the editable profile fields (role/company/bio) + 3 attributes from
    // the profile via the LLM — same idea as the name: filled from LinkedIn, still
    // editable in the profile form afterwards. Best-effort: any failure leaves the
    // existing values untouched (coalesce in SQL), and never fails the import.
    let fields: ProfileFields | null = null;
    if (mistralConfigured) {
      try {
        const { rows } = await pool.query<{ locale: "de" | "en" | null }>(
          `select locale from users where id = $1`,
          [userId],
        );
        const locale = rows[0]?.locale === "en" ? "en" : "de";
        fields = await extractProfileFields(profile, locale);
      } catch (err) {
        console.error("[linkedin] profile field extraction failed", err);
      }
    }

    // The real first name from LinkedIn replaces the random placeholder name.
    // Clearing skill_suggestions makes the Skills screen re-analyse the fresh
    // profile; the user's saved skill selection (user_skills) stays untouched —
    // new suggestions only pre-select when nothing is saved yet.
    const firstName = profile.first_name?.trim() || null;
    const attributes = fields && fields.attributes.length ? fields.attributes : null;
    await pool.query(
      `update users set linkedin_profile = $2,
              skill_suggestions = null,
              avatar_url = coalesce($3, avatar_url),
              name = coalesce($4, name),
              role = coalesce($5, role),
              company = coalesce($6, company),
              bio = coalesce($7, bio),
              attributes = case when $8::text[] is not null then $8::text[] else attributes end
         where id = $1`,
      [
        userId,
        profile,
        avatarUrl,
        firstName,
        fields?.role ?? null,
        fields?.company ?? null,
        fields?.bio ?? null,
        attributes,
      ],
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

// POST /api/me/skill-suggestions { lang? } → generate suggestions from the
// stored LinkedIn profile + the community pool (inverse) via Mistral, in the
// user's UI language; canonicalise the labels into concept ids (creating new
// bilingual concepts as needed), store and return them.
me.post("/skill-suggestions", requireAuth, async (c) => {
  const userId = c.get("userId");
  if (!mistralConfigured) return c.json({ error: "mistral_not_configured" }, 503);
  const body = await c.req
    .json<{ lang?: string }>()
    .catch(() => ({}) as { lang?: string });
  const lang = body.lang === "en" ? ("en" as const) : ("de" as const);

  const { rows } = await pool.query<{ linkedin_profile: unknown }>(
    `select linkedin_profile from users where id = $1`,
    [userId],
  );
  const profile = rows[0]?.linkedin_profile;
  if (!profile) return c.json({ error: "no_profile" }, 400);

  // Pool of skill labels from users sharing ANY community with the viewer
  // (same candidate set as matches.ts), split by kind, most common first. Fed
  // inversely into the prompt so the suggestions are likely to produce matches.
  // Labels are localized for the user — verbatim reuse still resolves to the
  // same concept because canonicalisation matches both language columns.
  const labelExpr = lang === "en" ? "coalesce(s.label_en, s.label)" : "s.label";
  const poolRows = (
    await pool.query<{ kind: "seek" | "offer"; label: string }>(
      `select us.kind, ${labelExpr} as label
         from user_skills us
         join skills s on s.id = us.skill_id
        where us.user_id in (
          select distinct m.user_id
            from community_members m
           where m.user_id <> $1
             and m.community_id in (
               select community_id from community_members where user_id = $1
             )
        )
        group by us.kind, ${labelExpr}
        order by count(*) desc
        limit 50`,
      [userId],
    )
  ).rows;
  const poolSeeks = poolRows.filter((r) => r.kind === "seek").map((r) => r.label).slice(0, 25);
  const poolOffers = poolRows.filter((r) => r.kind === "offer").map((r) => r.label).slice(0, 25);

  try {
    const labels = await suggestSkills(profile, poolSeeks, poolOffers, lang);
    // Free-text labels → canonical concept ids (new concepts inserted on the fly).
    const [seeks, offers] = await Promise.all([
      canonicalizeLabels(labels.seeks, lang),
      canonicalizeLabels(labels.offers, lang),
    ]);
    const suggestions: SkillSuggestions = { seeks, offers };
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

// DELETE /api/me/linkedin → remove LinkedIn URL, profile data, avatar and
// skill suggestions so the user can start fresh or disconnect a wrong account.
me.delete("/linkedin", requireAuth, async (c) => {
  await pool.query(
    `update users
     set linkedin_url        = null,
         linkedin_profile    = null,
         linkedin_consent_at = null,
         avatar_data         = null,
         avatar_mime         = null,
         avatar_url          = null,
         skill_suggestions   = null
     where id = $1`,
    [c.get("userId")],
  );
  return c.json({ ok: true });
});

// POST /api/me/website { url } → store the user's own website URL. No consent
// or scraping (it's their public site); reading the site comes later. DELETE
// clears it. The URL is stored verbatim; the client prepends https:// for links.
me.post("/website", requireAuth, async (c) => {
  const body = await c.req
    .json<{ url?: string }>()
    .catch(() => ({}) as { url?: string });
  const url = body.url?.trim().slice(0, 300);
  if (!url) return c.json({ error: "url_required" }, 400);
  // Loose sanity check: must contain a dot and no whitespace (e.g. "acme.com").
  if (/\s/.test(url) || !url.includes(".")) {
    return c.json({ error: "invalid_url" }, 400);
  }
  await pool.query(`update users set website_url = $2 where id = $1`, [
    c.get("userId"),
    url,
  ]);
  return c.json({ ok: true });
});

me.delete("/website", requireAuth, async (c) => {
  await pool.query(`update users set website_url = null where id = $1`, [
    c.get("userId"),
  ]);
  return c.json({ ok: true });
});

// --- Uploaded files (CV, pitch deck, …) ------------------------------------
// Bytes live on the server volume (see files.ts); only metadata is in the DB.

// GET /api/me/files → the user's uploaded files (metadata only).
me.get("/files", requireAuth, async (c) => {
  const { rows } = await pool.query(
    `select id, filename, mime, size_bytes as "sizeBytes", created_at as "createdAt"
       from user_files where user_id = $1 order by created_at desc`,
    [c.get("userId")],
  );
  return c.json(rows);
});

// POST /api/me/files (multipart, field "file") → store one file. Enforces the
// per-user count, MIME allowlist and size cap. Returns the new file's metadata.
me.post("/files", requireAuth, async (c) => {
  const userId = c.get("userId");

  const { rows: countRows } = await pool.query<{ n: number }>(
    `select count(*)::int as n from user_files where user_id = $1`,
    [userId],
  );
  if ((countRows[0]?.n ?? 0) >= MAX_FILES_PER_USER) {
    return c.json({ error: "too_many_files" }, 400);
  }

  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) return c.json({ error: "file_required" }, 400);
  if (!ALLOWED_MIME.has(file.type)) return c.json({ error: "unsupported_type" }, 400);

  const data = Buffer.from(await file.arrayBuffer());
  if (data.byteLength === 0) return c.json({ error: "file_required" }, 400);
  if (data.byteLength > MAX_FILE_BYTES) return c.json({ error: "file_too_large" }, 400);

  const filename = (file.name || "datei").trim().slice(0, 200) || "datei";
  const id = randomUUID();
  const storagePath = `${userId}/${id}`;
  await saveFile(storagePath, data);

  const { rows } = await pool.query(
    `insert into user_files (id, user_id, filename, mime, size_bytes, storage_path)
     values ($1, $2, $3, $4, $5, $6)
     returning id, filename, mime, size_bytes as "sizeBytes", created_at as "createdAt"`,
    [id, userId, filename, file.type, data.byteLength, storagePath],
  );
  return c.json(rows[0], 201);
});

// GET /api/me/files/:fileId/download → stream the owner's file as an attachment.
me.get("/files/:fileId/download", requireAuth, async (c) => {
  const { rows } = await pool.query<{
    filename: string;
    mime: string;
    storage_path: string;
  }>(
    `select filename, mime, storage_path from user_files where id = $1 and user_id = $2`,
    [c.req.param("fileId"), c.get("userId")],
  );
  const row = rows[0];
  if (!row) return c.json({ error: "not_found" }, 404);
  const data = await readFileBytes(row.storage_path).catch(() => null);
  if (!data) return c.json({ error: "not_found" }, 404);
  return c.body(new Uint8Array(data), 200, {
    "Content-Type": row.mime,
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
  });
});

// DELETE /api/me/files/:fileId → remove the owner's file (DB row + disk).
me.delete("/files/:fileId", requireAuth, async (c) => {
  const { rows } = await pool.query<{ storage_path: string }>(
    `delete from user_files where id = $1 and user_id = $2 returning storage_path`,
    [c.req.param("fileId"), c.get("userId")],
  );
  if (rows.length === 0) return c.json({ error: "not_found" }, 404);
  await deleteFile(rows[0].storage_path);
  return c.json({ ok: true });
});

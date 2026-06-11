import { Hono } from "hono";
import { pool } from "../db.js";
import { type AuthEnv, requireAuth } from "../auth.js";

export const matches = new Hono<AuthEnv>();

// GET /api/matches — the logged-in user's matches across ALL their communities.
// Candidates are everyone who shares at least one community with the viewer
// (deduplicated), scored against the viewer's seeks/offers. A user in several
// communities therefore gets a larger pool — that's the intended model.
matches.get("/", requireAuth, async (c) => {
  const viewerId = c.get("userId");

  // 1. Viewer's own skills.
  const mine = await pool.query<{ kind: "seek" | "offer"; label: string }>(
    `select us.kind, s.label
       from user_skills us join skills s on s.id = us.skill_id
      where us.user_id = $1`,
    [viewerId],
  );
  const mySeeks = new Set(mine.rows.filter((r) => r.kind === "seek").map((r) => r.label));
  const myOffers = new Set(mine.rows.filter((r) => r.kind === "offer").map((r) => r.label));

  // 2. Candidate pool: distinct users who share ANY community with the viewer
  //    (excluding the viewer). Union across all of the viewer's memberships.
  const candidates = await pool.query(
    `select distinct u.id, u.name, u.role, u.company,
            u.avatar_url as "avatarUrl", u.bio, u.attributes
       from users u
       join community_members m on m.user_id = u.id
      where u.id <> $1
        and m.community_id in (
          select community_id from community_members where user_id = $1
        )`,
    [viewerId],
  );
  if (candidates.rows.length === 0) return c.json([]);

  const ids = candidates.rows.map((r) => r.id);

  // 3. Their skills, in one round-trip.
  const skillRows = (
    await pool.query<{ user_id: string; kind: "seek" | "offer"; label: string }>(
      `select us.user_id, us.kind, s.label
         from user_skills us join skills s on s.id = us.skill_id
        where us.user_id = any($1)`,
      [ids],
    )
  ).rows;

  // 4. Connection status from the viewer's perspective.
  const conns = (
    await pool.query<{ requester_id: string; addressee_id: string; status: string }>(
      `select requester_id, addressee_id, status
         from connections
        where (requester_id = $1 and addressee_id = any($2))
           or (addressee_id = $1 and requester_id = any($2))`,
      [viewerId, ids],
    )
  ).rows;

  const seeksByUser = new Map<string, string[]>();
  const offersByUser = new Map<string, string[]>();
  for (const r of skillRows) {
    const target = r.kind === "seek" ? seeksByUser : offersByUser;
    const arr = target.get(r.user_id) ?? [];
    arr.push(r.label);
    target.set(r.user_id, arr);
  }

  const result = candidates.rows.map((u) => {
    const seeks = seeksByUser.get(u.id) ?? [];
    const offers = offersByUser.get(u.id) ?? [];

    // Why matched: what they offer that I seek, and what they seek that I offer.
    const theyOffer = offers.filter((label) => mySeeks.has(label));
    const theySeek = seeks.filter((label) => myOffers.has(label));

    // Naive overlap score, normalised to 0..100. Replaced by embeddings later.
    const overlap = theyOffer.length + theySeek.length;
    const denom = Math.max(mySeeks.size + myOffers.size, 1);
    const matchScore = Math.min(100, Math.round((overlap / denom) * 100));

    const conn = conns.find(
      (x) => x.requester_id === u.id || x.addressee_id === u.id,
    );
    let connection: "none" | "requested" | "incoming" | "connected" = "none";
    if (conn) {
      if (conn.status === "connected") connection = "connected";
      else if (conn.requester_id === viewerId) connection = "requested";
      else connection = "incoming";
    }

    return {
      id: u.id,
      name: u.name,
      role: u.role,
      company: u.company ?? undefined,
      avatarUrl: u.avatarUrl,
      bio: u.bio ?? undefined,
      attributes: u.attributes,
      seeks,
      offers,
      matchScore,
      matchedOn: { theyOffer, theySeek },
      connection,
    };
  });

  // Hide zero-overlap candidates — except when a connection exists or is
  // pending: an incoming request must stay visible so it can be accepted.
  const visible = result.filter((m) => m.matchScore > 0 || m.connection !== "none");

  // Best matches first.
  visible.sort((a, b) => b.matchScore - a.matchScore);
  return c.json(visible);
});

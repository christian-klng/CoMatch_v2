import { Hono } from "hono";
import { pool } from "../db.js";

export const matches = new Hono();

// GET /api/matches?viewer=<userId>&community=<communityId>
// Returns the other community members scored against the viewer's seeks/offers.
// This is the real-data shape of MOCK_MATCHES (src/lib/mockData.ts).
matches.get("/", async (c) => {
  const viewerId = c.req.query("viewer");
  const communityId = c.req.query("community");
  if (!viewerId || !communityId) {
    return c.json({ error: "viewer and community query params are required" }, 400);
  }

  // 1. Viewer's own skills.
  const mine = await pool.query<{ kind: "seek" | "offer"; label: string }>(
    `select us.kind, s.label
       from user_skills us join skills s on s.id = us.skill_id
      where us.user_id = $1`,
    [viewerId],
  );
  const mySeeks = new Set(mine.rows.filter((r) => r.kind === "seek").map((r) => r.label));
  const myOffers = new Set(mine.rows.filter((r) => r.kind === "offer").map((r) => r.label));

  // 2. Candidate members in the same community (excluding the viewer).
  const candidates = await pool.query(
    `select u.id, u.name, u.role, u.company,
            u.avatar_url as "avatarUrl", u.bio, u.attributes
       from users u
       join community_members m on m.user_id = u.id
      where m.community_id = $1 and u.id <> $2`,
    [communityId, viewerId],
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

  // Best matches first.
  result.sort((a, b) => b.matchScore - a.matchScore);
  return c.json(result);
});

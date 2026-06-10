// Mistral client for turning a stored LinkedIn profile into skill suggestions.
// Server-side only. Docs: https://docs.mistral.ai/api/endpoint/chat
//   POST https://api.mistral.ai/v1/chat/completions
//   Authorization: Bearer {MISTRAL_API_KEY}, response_format json_object

const API_KEY = process.env.MISTRAL_API_KEY;
const MODEL = process.env.MISTRAL_MODEL ?? "mistral-medium-latest";

export const mistralConfigured = Boolean(API_KEY);

export interface SkillSuggestions {
  seeks: string[];
  offers: string[];
}

/**
 * Suggest skill *labels* (free text — no fixed catalog) for a LinkedIn profile.
 * Two sources are blended:
 *   - grounded in the profile (what the person can do / is looking for), and
 *   - the community pool, applied INVERSELY to spark matches: things others
 *     SEEK become suggested "offers"; things others OFFER become suggested
 *     "seeks". Existing pool labels are reused verbatim so matching connects.
 * Returns labels (not ids); the caller canonicalises them. Throws on API errors.
 */
export async function suggestSkills(
  profile: unknown,
  poolSeeks: string[],
  poolOffers: string[],
): Promise<SkillSuggestions> {
  if (!mistralConfigured) throw new Error("Mistral is not configured");

  const poolList = (xs: string[]) =>
    xs.length ? xs.map((x) => `- ${x}`).join("\n") : "(noch keine)";

  const system =
    "Du unterstützt eine Matching-App für Gründer:innen und Fachleute. Aus einem " +
    "LinkedIn-Profil und dem Pool anderer Nutzer leitest du passende Skills ab. " +
    "Skills sind kurze deutsche Substantiv-Phrasen (z. B. \"Frontend-Entwicklung\", " +
    "\"Smart Contracts\", \"Fundraising\"). Antworte immer als JSON-Objekt.";
  const userMsg =
    `LinkedIn-Profil (JSON):\n${JSON.stringify(profile).slice(0, 8000)}\n\n` +
    `Andere Nutzer SUCHEN bereits (für invers abgeleitete "offers" wiederverwenden):\n` +
    `${poolList(poolSeeks)}\n\n` +
    `Andere Nutzer BIETEN bereits (für invers abgeleitete "seeks" wiederverwenden):\n` +
    `${poolList(poolOffers)}\n\n` +
    `Erzeuge zwei Listen mit je 6-8 Skill-Labels:\n` +
    `- "offers" = was die Person laut Profil kann/anbietet, PLUS passende Labels aus ` +
    `"Andere SUCHEN" (invers — so findet sie, wer sie braucht).\n` +
    `- "seeks" = was die Person laut Profil sucht/braucht, PLUS passende Labels aus ` +
    `"Andere BIETEN" (invers).\n` +
    `Wenn ein passendes Label im Pool existiert, übernimm es WORTGLEICH; sonst erfinde ` +
    `ein neues, kurzes Label aus dem Profil. Keine ids, nur Labels. ` +
    `Antworte als JSON: {"seeks":["label",...],"offers":["label",...]}.`;

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mistral ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";

  let parsed: { seeks?: unknown; offers?: unknown } = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  // Keep non-empty string labels, dedup case-insensitively, cap at 8. The
  // caller canonicalises these labels into skill rows/ids.
  const clean = (arr: unknown): string[] => {
    if (!Array.isArray(arr)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of arr) {
      if (typeof x !== "string") continue;
      const label = x.trim().replace(/\s+/g, " ");
      const key = label.toLowerCase();
      if (!label || seen.has(key)) continue;
      seen.add(key);
      out.push(label);
      if (out.length === 8) break;
    }
    return out;
  };

  return { seeks: clean(parsed.seeks), offers: clean(parsed.offers) };
}

// Mistral client for turning a stored LinkedIn profile into skill suggestions.
// Server-side only. Docs: https://docs.mistral.ai/api/endpoint/chat
//   POST https://api.mistral.ai/v1/chat/completions
//   Authorization: Bearer {MISTRAL_API_KEY}, response_format json_object

const API_KEY = process.env.MISTRAL_API_KEY;
const MODEL = process.env.MISTRAL_MODEL ?? "mistral-medium-latest";

export const mistralConfigured = Boolean(API_KEY);

export type SkillLocale = "de" | "en";

export interface SkillSuggestions {
  seeks: string[];
  offers: string[];
}

/** Low-level chat call: send system+user, parse the JSON object answer. */
async function chatJson(
  system: string,
  userMsg: string,
  maxTokens: number,
): Promise<Record<string, unknown>> {
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
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mistral ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  try {
    return JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
  } catch {
    return {};
  }
}

/**
 * Translate skill labels between the two app languages, preserving order.
 * Returns exactly one translation per input (the input itself as fallback
 * when the model drops an item). Throws on API errors — callers decide
 * whether a missing translation is acceptable.
 */
export async function translateSkillLabels(
  labels: string[],
  target: SkillLocale,
): Promise<string[]> {
  if (!mistralConfigured) throw new Error("Mistral is not configured");
  if (labels.length === 0) return [];

  const targetName = target === "en" ? "ENGLISCH" : "DEUTSCH";
  const system =
    "Du übersetzt Skill-Labels einer Matching-App für Gründer:innen und " +
    "Fachleute. Labels sind kurze Substantiv-Phrasen. Übernimm etablierte " +
    "Fachbegriffe unverändert (z. B. \"Machine Learning\"). Antworte immer " +
    "als JSON-Objekt.";
  const userMsg =
    `Übersetze jedes Label nach ${targetName}. Gib ein JSON-Objekt zurück: ` +
    `{"translations":["…", …]} — gleiche Reihenfolge und Anzahl wie die Eingabe.\n\n` +
    `Labels (JSON):\n${JSON.stringify(labels)}`;

  const parsed = await chatJson(system, userMsg, 800);
  const out = Array.isArray(parsed.translations) ? parsed.translations : [];
  return labels.map((label, i) => {
    const tr = out[i];
    return typeof tr === "string" && tr.trim() ? tr.trim().replace(/\s+/g, " ") : label;
  });
}

/**
 * Suggest skill *labels* (free text — no fixed catalog) for a LinkedIn profile,
 * in the user's language. Two sources are blended:
 *   - grounded in the profile (what the person can do / is looking for), and
 *   - the community pool, applied INVERSELY to spark matches: things others
 *     SEEK become suggested "offers"; things others OFFER become suggested
 *     "seeks". Existing pool labels are reused verbatim so matching connects.
 * The pool labels arrive already localized for the user — verbatim reuse keeps
 * working because canonicalisation resolves both language columns.
 * Returns labels (not ids); the caller canonicalises them. Throws on API errors.
 */
export async function suggestSkills(
  profile: unknown,
  poolSeeks: string[],
  poolOffers: string[],
  locale: SkillLocale = "de",
): Promise<SkillSuggestions> {
  if (!mistralConfigured) throw new Error("Mistral is not configured");

  const poolList = (xs: string[]) =>
    xs.length ? xs.map((x) => `- ${x}`).join("\n") : "(noch keine)";
  const languageName = locale === "en" ? "ENGLISCH" : "DEUTSCH";
  const examples =
    locale === "en"
      ? '"Frontend Development", "Smart Contracts", "Fundraising"'
      : '"Frontend-Entwicklung", "Smart Contracts", "Fundraising"';

  const system =
    "Du unterstützt eine Matching-App für Gründer:innen und Fachleute. Aus einem " +
    "LinkedIn-Profil und dem Pool anderer Nutzer leitest du passende Skills ab. " +
    `Skills sind kurze Substantiv-Phrasen auf ${languageName} (z. B. ${examples}). ` +
    "Antworte immer als JSON-Objekt.";
  const userMsg =
    `LinkedIn-Profil (JSON):\n${JSON.stringify(profile).slice(0, 8000)}\n\n` +
    `Andere Nutzer SUCHEN bereits (für invers abgeleitete "offers" wiederverwenden):\n` +
    `${poolList(poolSeeks)}\n\n` +
    `Andere Nutzer BIETEN bereits (für invers abgeleitete "seeks" wiederverwenden):\n` +
    `${poolList(poolOffers)}\n\n` +
    `Erzeuge zwei Listen mit je 6-8 Skill-Labels auf ${languageName}:\n` +
    `- "offers" = was die Person laut Profil kann/anbietet, PLUS passende Labels aus ` +
    `"Andere SUCHEN" (invers — so findet sie, wer sie braucht).\n` +
    `- "seeks" = was die Person laut Profil sucht/braucht, PLUS passende Labels aus ` +
    `"Andere BIETEN" (invers).\n` +
    `Wenn ein passendes Label im Pool existiert, übernimm es WORTGLEICH; sonst erfinde ` +
    `ein neues, kurzes Label aus dem Profil. Keine ids, nur Labels. ` +
    `Antworte als JSON: {"seeks":["label",...],"offers":["label",...]}.`;

  const parsed = (await chatJson(system, userMsg, 500)) as {
    seeks?: unknown;
    offers?: unknown;
  };

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

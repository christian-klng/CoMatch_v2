// Mistral client for turning a stored LinkedIn profile into skill suggestions.
// Server-side only. Docs: https://docs.mistral.ai/api/endpoint/chat
//   POST https://api.mistral.ai/v1/chat/completions
//   Authorization: Bearer {MISTRAL_API_KEY}, response_format json_object

const API_KEY = process.env.MISTRAL_API_KEY;
const MODEL = process.env.MISTRAL_MODEL ?? "mistral-medium-latest";

export const mistralConfigured = Boolean(API_KEY);

export interface CatalogSkill {
  id: string;
  label: string;
}

export interface SkillSuggestions {
  seeks: string[];
  offers: string[];
}

/** Suggest 4-6 seeks and 4-6 offers for a LinkedIn profile, restricted to the
 *  controlled catalog. Returns only valid catalog ids. Throws on API errors. */
export async function suggestSkills(
  profile: unknown,
  catalog: CatalogSkill[],
): Promise<SkillSuggestions> {
  if (!mistralConfigured) throw new Error("Mistral is not configured");

  const validIds = new Set(catalog.map((c) => c.id));
  const catalogList = catalog.map((c) => `${c.id}: ${c.label}`).join("\n");

  const system =
    "Du unterstützt eine Matching-App für Gründer:innen und Fachleute. Aus einem " +
    "LinkedIn-Profil leitest du passende Skills ab — ausschließlich aus dem " +
    "vorgegebenen Katalog. Antworte immer als JSON-Objekt.";
  const userMsg =
    `Skill-Katalog (id: label):\n${catalogList}\n\n` +
    `LinkedIn-Profil (JSON):\n${JSON.stringify(profile).slice(0, 8000)}\n\n` +
    `Wähle 4-6 "offers" (was die Person kann/anbietet, abgeleitet aus Erfahrung ` +
    `und Skills) und 4-6 "seeks" (was die Person in einem Gründer-/Netzwerk-` +
    `Kontext plausibel sucht). Verwende AUSSCHLIESSLICH ids aus dem Katalog. ` +
    `Antworte als JSON: {"seeks":["id",...],"offers":["id",...]}.`;

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
      max_tokens: 400,
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

  const clean = (arr: unknown): string[] =>
    Array.isArray(arr)
      ? [...new Set(arr.filter((x): x is string => typeof x === "string" && validIds.has(x)))].slice(0, 6)
      : [];

  return { seeks: clean(parsed.seeks), offers: clean(parsed.offers) };
}

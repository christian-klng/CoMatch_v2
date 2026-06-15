// Thin Unipile client for reading LinkedIn profiles. Server-side only — the
// API key is secret and must never reach the browser.
//
// Docs: https://developer.unipile.com/docs/retrieving-users
//   GET https://{DSN}/api/v1/users/{identifier}?linkedin_sections=*&account_id={ACCOUNT_ID}
//   Header: X-API-KEY: {API_KEY}

const DSN = process.env.UNIPILE_DSN; // host[:port], e.g. api1.unipile.com:13111
const API_KEY = process.env.UNIPILE_API_KEY;
const ACCOUNT_ID = process.env.UNIPILE_ACCOUNT_ID; // the connected LinkedIn account

export const unipileConfigured = Boolean(DSN && API_KEY && ACCOUNT_ID);

/** Extract the LinkedIn public identifier from user input. Accepts:
 *  - Full URL: linkedin.com/in/handle (with or without https/www)
 *  - Explicit prefix: in/handle or /in/handle
 *  Bare words like "Saverio" or "Christian" are rejected — they look like
 *  names but LinkedIn may have a real profile with that slug. */
export function linkedinIdentifier(raw: string): string | null {
  const s = raw.trim();

  // Full or protocol-relative URL containing linkedin.com/in/…
  const urlMatch = s.match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  if (urlMatch) {
    try { return decodeURIComponent(urlMatch[1]); } catch { return urlMatch[1]; }
  }

  // Explicit "in/handle" or "/in/handle" prefix only — no bare words.
  const prefixMatch = s.match(/^\/?in\/([^\s/?#.]+)\/?$/i);
  if (prefixMatch) {
    try { return decodeURIComponent(prefixMatch[1]); } catch { return prefixMatch[1]; }
  }

  return null;
}

export interface LinkedInProfile {
  public_identifier?: string;
  provider_id?: string;
  first_name?: string;
  last_name?: string;
  headline?: string;
  summary?: string;
  profile_picture_url?: string;
  profile_picture_url_large?: string;
  [key: string]: unknown;
}

/** Fetch a LinkedIn profile via Unipile. Throws on transport/HTTP errors. */
export async function fetchLinkedInProfile(identifier: string): Promise<LinkedInProfile> {
  if (!unipileConfigured) throw new Error("Unipile is not configured");
  const url =
    `https://${DSN}/api/v1/users/${encodeURIComponent(identifier)}` +
    `?linkedin_sections=*&account_id=${encodeURIComponent(ACCOUNT_ID!)}`;
  const res = await fetch(url, {
    headers: { "X-API-KEY": API_KEY!, accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Unipile ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as LinkedInProfile;
}

/** Download an image (LinkedIn picture URLs are temporary). Returns bytes +
 *  mime, or null if the fetch fails. */
export async function downloadImage(
  imageUrl: string,
): Promise<{ data: Buffer; mime: string } | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    const data = Buffer.from(await res.arrayBuffer());
    return { data, mime };
  } catch {
    return null;
  }
}

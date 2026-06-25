import { useEffect, useState } from "react";
import type { AdminUserDetail } from "./types";
import { backfillUserProfile, downloadUserFile, getUser, updateUser } from "./api";

/** Prepend https:// when the stored URL has no protocol. */
const withProtocol = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UserDetail({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    getUser(userId)
      .then((u) => {
        setUser(u);
        setName(u.name ?? "");
        setRole(u.role ?? "");
        setCompany(u.company ?? "");
        setBio(u.bio ?? "");
        setLinkedinUrl(u.linkedinUrl ?? "");
        setWebsiteUrl(u.websiteUrl ?? "");
      })
      .catch(() => setError("Nutzer konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [userId]);

  const save = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateUser(user.id, {
        name: name.trim() || null,
        role: role.trim() || null,
        company: company.trim() || null,
        bio: bio.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
      });
      setSaved(true);
      load();
    } catch {
      setError("Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const backfill = async () => {
    if (!user || busy) return;
    if (!window.confirm(
      "Profilfelder (Rolle, Unternehmen, Bio) und 3 Tags per KI aus dem LinkedIn-Profil neu ableiten? " +
      "Vorhandene Werte werden überschrieben, sofern die KI etwas liefert.",
    )) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const { fields } = await backfillUserProfile(user.id);
      setSaved(true);
      const parts = [
        fields.role && `Rolle: ${fields.role}`,
        fields.company && `Unternehmen: ${fields.company}`,
        fields.attributes.length && `Tags: ${fields.attributes.join(", ")}`,
      ].filter(Boolean);
      setBackfillMsg(parts.length ? `Übernommen → ${parts.join(" · ")}` : "Keine Felder ableitbar.");
      load();
    } catch (e) {
      const msg = e instanceof Error && /→ 400\b/.test(e.message)
        ? "Kein eingelesenes LinkedIn-Profil vorhanden."
        : e instanceof Error && /→ 503\b/.test(e.message)
          ? "KI (Mistral) ist nicht konfiguriert."
          : "Backfill fehlgeschlagen.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const clearLinkedin = async () => {
    if (!user || !window.confirm("LinkedIn-Daten, Avatar und Skill-Vorschläge dieses Nutzers löschen?")) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateUser(user.id, { clearLinkedin: true });
      setSaved(true);
      load();
    } catch {
      setError("LinkedIn-Bereinigung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <button className="back" onClick={onBack}>← Nutzerliste</button>

      {loading && <p className="muted">Lädt…</p>}
      {error && <p className="alert">{error}</p>}
      {saved && <p className="alert" style={{ background: "var(--success-bg)", color: "var(--success)" }}>Gespeichert ✓</p>}

      {user && (
        <>
          <header className="head" style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22 }}>{user.name ?? <em>Kein Name</em>}</h1>
            <p className="muted small">{user.email ?? "–"}</p>
            <p className="faint small">ID: <span style={{ fontFamily: "monospace" }}>{user.id}</span></p>
            <p className="faint small">Erstellt: {new Date(user.createdAt).toLocaleString("de-DE")}</p>
          </header>

          {/* Editable profile fields */}
          <section className="card">
            <h2>Profilfelder</h2>
            <div className="form">
              <label className="field-label">
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Leer lassen zum Leeren" />
              </label>
              <label className="field-label">
                Rolle
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Leer lassen zum Leeren" />
              </label>
              <label className="field-label">
                Unternehmen
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Leer lassen zum Leeren" />
              </label>
              <label className="field-label">
                Bio
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Leer lassen zum Leeren"
                  style={{ resize: "vertical", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 15, fontFamily: "inherit" }}
                />
              </label>
              <div className="detail-row" style={{ alignItems: "flex-start" }}>
                <span className="detail-key">Tags</span>
                <span className="detail-val">
                  {user.attributes.length === 0 ? (
                    <em className="faint">–</em>
                  ) : (
                    <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {user.attributes.map((a) => (
                        <span key={a} className="skill-chip">{a}</span>
                      ))}
                    </span>
                  )}
                </span>
              </div>
              <button className="btn primary" onClick={save} disabled={busy}>
                {busy ? "Speichere…" : "Speichern"}
              </button>
            </div>
          </section>

          {/* KI-Profilextraktion (Backfill) */}
          <section className="card">
            <h2>KI-Profilextraktion</h2>
            <p className="muted small" style={{ marginTop: 0 }}>
              Leitet Rolle, Unternehmen, Bio und 3 Tags per KI aus dem gespeicherten
              LinkedIn-Profil ab und schreibt sie ins Profil. Vorhandene Werte werden
              überschrieben, sofern die KI ein Ergebnis liefert.
            </p>
            {backfillMsg && (
              <p className="alert small" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                {backfillMsg}
              </p>
            )}
            <button
              className="btn primary"
              onClick={backfill}
              disabled={busy || !user.linkedinProfileRead}
              title={user.linkedinProfileRead ? "" : "Kein eingelesenes LinkedIn-Profil vorhanden"}
            >
              {busy ? "Leite ab…" : "Profilfelder aus LinkedIn ableiten"}
            </button>
            {!user.linkedinProfileRead && (
              <p className="faint small" style={{ marginTop: 8 }}>
                Erst möglich, wenn ein LinkedIn-Profil eingelesen wurde.
              </p>
            )}
          </section>

          {/* LinkedIn */}
          <section className="card">
            <h2>LinkedIn</h2>
            <div className="form">
              <div className="detail-row">
                <span className="detail-key">URL gespeichert</span>
                <span className="detail-val">{user.linkedinUrl ?? <em className="faint">–</em>}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Profil eingelesen</span>
                <span className="detail-val">{user.linkedinProfileRead ? "✓ Ja" : "Nein"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Zustimmung am</span>
                <span className="detail-val">
                  {user.linkedinConsentAt
                    ? new Date(user.linkedinConsentAt).toLocaleString("de-DE")
                    : <em className="faint">–</em>}
                </span>
              </div>
              <label className="field-label">
                LinkedIn-URL überschreiben / leeren
                <input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="linkedin.com/in/… oder leer lassen zum Leeren"
                />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn primary" onClick={save} disabled={busy}>
                  {busy ? "…" : "URL speichern"}
                </button>
                {(user.linkedinUrl || user.linkedinProfileRead || user.hasAvatarData) && (
                  <button className="btn danger" onClick={clearLinkedin} disabled={busy}>
                    LinkedIn + Avatar + Vorschläge leeren
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Website */}
          <section className="card">
            <h2>Website</h2>
            <div className="form">
              <div className="detail-row">
                <span className="detail-key">URL gespeichert</span>
                <span className="detail-val">
                  {user.websiteUrl
                    ? <a href={withProtocol(user.websiteUrl)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>{user.websiteUrl}</a>
                    : <em className="faint">–</em>}
                </span>
              </div>
              <label className="field-label">
                Website-URL überschreiben / leeren
                <input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="example.com oder leer lassen zum Leeren"
                />
              </label>
              <button className="btn primary" onClick={save} disabled={busy}>
                {busy ? "…" : "Speichern"}
              </button>
            </div>
          </section>

          {/* Contact preferences (read-only) */}
          <section className="card">
            <h2>Kontakt</h2>
            <div className="detail-row">
              <span className="detail-key">Kommunikationskanal</span>
              <span className="detail-val">
                {user.contactChannel === "linkedin" ? "LinkedIn" : "E-Mail"}
              </span>
            </div>
            <div className="detail-row" style={{ alignItems: "flex-start", marginTop: 8 }}>
              <span className="detail-key">Über uns</span>
              <span className="detail-val" style={{ whiteSpace: "pre-wrap" }}>
                {user.contactNote ?? <em className="faint">–</em>}
              </span>
            </div>
          </section>

          {/* Uploaded files */}
          <section className="card">
            <h2>Dateien ({user.files.length})</h2>
            {user.files.length === 0 ? (
              <p className="muted small">Keine Dateien hochgeladen.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {user.files.map((f) => (
                  <li key={f.id} className="detail-row" style={{ alignItems: "center" }}>
                    <button
                      onClick={() => downloadUserFile(user.id, f).catch(() => setError("Download fehlgeschlagen."))}
                      style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "var(--brand)", cursor: "pointer", textDecoration: "underline", textAlign: "left" }}
                    >
                      {f.filename}
                    </button>
                    <span className="faint small" style={{ marginLeft: "auto" }}>
                      {formatBytes(f.sizeBytes)} · {new Date(f.createdAt).toLocaleDateString("de-DE")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Avatar */}
          <section className="card">
            <h2>Avatar</h2>
            <div className="detail-row">
              <span className="detail-key">Avatar-URL</span>
              <span className="detail-val">
                {user.avatarUrl
                  ? <a href={user.avatarUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>{user.avatarUrl}</a>
                  : <em className="faint">–</em>}
              </span>
            </div>
            <div className="detail-row" style={{ marginTop: 8 }}>
              <span className="detail-key">Bild-Daten (blob)</span>
              <span className="detail-val">{user.hasAvatarData ? "✓ Vorhanden" : <em className="faint">Nicht vorhanden</em>}</span>
            </div>
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt="Avatar" style={{ marginTop: 12, width: 80, height: 80, borderRadius: 40, objectFit: "cover", border: "1px solid var(--border)" }} />
            )}
          </section>

          {/* Skills */}
          <section className="card">
            <h2>Skills</h2>
            {user.skills.length === 0 ? (
              <p className="muted small">Keine Skills gespeichert.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {(["seek", "offer"] as const).map((kind) => {
                  const items = user.skills.filter((s) => s.kind === kind);
                  if (items.length === 0) return null;

                  const suggSet = new Set<string>(
                    kind === "seek"
                      ? (user.skillSuggestions?.seeks ?? [])
                      : (user.skillSuggestions?.offers ?? []),
                  );
                  const fromLinkedin = items.filter((s) => suggSet.has(s.id));
                  const manual = items.filter((s) => !suggSet.has(s.id));

                  return (
                    <div key={kind}>
                      <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 14 }}>
                        {kind === "seek" ? "Ich suche" : "Ich biete"}
                        <span className="stat-badge">{items.length} gesamt</span>
                        {user.skillSuggestions && (
                          <>
                            <span className="stat-badge linkedin">{fromLinkedin.length} via LinkedIn</span>
                            <span className="stat-badge manual">{manual.length} manuell</span>
                          </>
                        )}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {items.map((s) => (
                          <span
                            key={s.id}
                            className={`skill-chip ${user.skillSuggestions ? (suggSet.has(s.id) ? "from-linkedin" : "manual") : ""}`}
                            title={user.skillSuggestions ? (suggSet.has(s.id) ? "LinkedIn-Vorschlag übernommen" : "Manuell hinzugefügt") : ""}
                          >
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Rejected suggestions */}
                {user.skillSuggestions && (() => {
                  const savedIds = new Set(user.skills.map((s) => s.id));
                  const allSuggIds = [
                    ...(user.skillSuggestions.seeks ?? []),
                    ...(user.skillSuggestions.offers ?? []),
                  ];
                  const rejected = allSuggIds.filter((id) => !savedIds.has(id));
                  if (rejected.length === 0) return null;
                  return (
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--faint)" }}>
                        LinkedIn-Vorschläge abgelehnt ({rejected.length})
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {rejected.map((id) => (
                          <span key={id} className="skill-chip rejected" title="Vorgeschlagen, aber nicht übernommen">{id}</span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {user.skillSuggestions && (
              <p className="faint small" style={{ marginTop: 12 }}>
                LinkedIn-Vorschläge gespeichert: {(user.skillSuggestions.seeks?.length ?? 0)} Sucht · {(user.skillSuggestions.offers?.length ?? 0)} Bietet
              </p>
            )}
            {!user.skillSuggestions && (
              <p className="faint small" style={{ marginTop: 8 }}>Kein LinkedIn-Import — Herkunft der Skills nicht bekannt.</p>
            )}
          </section>

          {/* Communities */}
          <section className="card">
            <h2>Communities ({user.communities.length})</h2>
            {user.communities.length === 0 ? (
              <p className="muted small">Noch keiner Community beigetreten.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {user.communities.map((c) => (
                  <li key={c.id} className="muted small">• {c.name}</li>
                ))}
              </ul>
            )}
          </section>

          {/* Meta */}
          <section className="card">
            <h2>Weitere Infos</h2>
            <div className="detail-row"><span className="detail-key">Sprache</span><span className="detail-val">{user.locale ?? <em className="faint">Browser-Erkennung</em>}</span></div>
          </section>
        </>
      )}
    </div>
  );
}

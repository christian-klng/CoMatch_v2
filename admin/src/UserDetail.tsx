import { useEffect, useState } from "react";
import type { AdminUserDetail } from "./types";
import { getUser, updateUser } from "./api";

export function UserDetail({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

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
      });
      setSaved(true);
      load();
    } catch {
      setError("Speichern fehlgeschlagen.");
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
              <button className="btn primary" onClick={save} disabled={busy}>
                {busy ? "Speichere…" : "Speichern"}
              </button>
            </div>
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
            <h2>Skills ({user.skills.length})</h2>
            {user.skills.length === 0 ? (
              <p className="muted small">Keine Skills gespeichert.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(["seek", "offer"] as const).map((kind) => {
                  const items = user.skills.filter((s) => s.kind === kind);
                  if (items.length === 0) return null;
                  return (
                    <div key={kind}>
                      <p className="faint small" style={{ marginBottom: 4 }}>
                        {kind === "seek" ? "Sucht" : "Bietet"}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {items.map((s) => (
                          <span key={s.label} className="skill-chip">{s.label}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="detail-row" style={{ marginTop: 12 }}>
              <span className="detail-key">Skill-Vorschläge (KI)</span>
              <span className="detail-val">{user.hasSkillSuggestions ? "✓ Vorhanden" : <em className="faint">–</em>}</span>
            </div>
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

import { useEffect, useState } from "react";
import type { AdminCommunity } from "./types";
import {
  createCommunity,
  deleteCommunity,
  listCommunities,
  updateCommunity,
} from "./api";
import { CommunityDetail } from "./CommunityDetail";

export function App() {
  const [items, setItems] = useState<AdminCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [creating, setCreating] = useState(false);

  const reload = () => {
    setLoading(true);
    listCommunities()
      .then((rows) => {
        setItems(rows);
        setError(null);
      })
      .catch(() => setError("Communities konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createCommunity({
        name: name.trim(),
        context: context.trim() || undefined,
        published: publishNow,
      });
      setName("");
      setContext("");
      setPublishNow(true);
      reload();
    } catch {
      setError("Community konnte nicht erstellt werden.");
    } finally {
      setCreating(false);
    }
  };

  const togglePublished = async (c: AdminCommunity) => {
    try {
      await updateCommunity(c.id, { published: !c.published });
      reload();
    } catch {
      setError("Status konnte nicht geändert werden.");
    }
  };

  const remove = async (c: AdminCommunity) => {
    if (!window.confirm(`Community „${c.name}" wirklich löschen?`)) return;
    try {
      await deleteCommunity(c.id);
      reload();
    } catch {
      setError("Community konnte nicht gelöscht werden.");
    }
  };

  const selected = items.find((c) => c.id === selectedId);
  if (selected) {
    return <CommunityDetail community={selected} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="page">
      <header className="head">
        <h1>CoMatch Admin</h1>
        <p className="muted">Communities verwalten · noch ohne Login (kommt später)</p>
      </header>

      {error && <p className="alert">{error}</p>}

      <section className="card">
        <h2>Neue Community</h2>
        <div className="form">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (z. B. TechFest Berlin 2025)"
          />
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Kontext (optional, z. B. Konferenz · 12.–13. Juni)"
          />
          <label className="check">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
            />
            Sofort veröffentlichen (beitretbar)
          </label>
          <button className="btn primary" onClick={create} disabled={!name.trim() || creating}>
            {creating ? "Erstelle…" : "Community erstellen"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="list-title">Communities {!loading && `(${items.length})`}</h2>

        {loading ? (
          <p className="muted">Lädt…</p>
        ) : items.length === 0 ? (
          <p className="muted">Noch keine Community angelegt.</p>
        ) : (
          <div className="list">
            {items.map((c) => (
              <div key={c.id} className="row">
                <button
                  className="row-main row-link"
                  onClick={() => setSelectedId(c.id)}
                  title="Mitglieder anzeigen"
                >
                  <div className="row-title">
                    <span className="cname">{c.name}</span>
                    {c.published ? (
                      <span className="tag live">live</span>
                    ) : (
                      <span className="tag draft">Entwurf</span>
                    )}
                  </div>
                  {c.context && <p className="muted small">{c.context}</p>}
                  <p className="faint small">{c.memberCount} Mitglieder ›</p>
                </button>

                <div className="code-box">
                  <span className="code-label">Beitritts-Code</span>
                  <span className="code">{c.code}</span>
                </div>

                <div className="row-actions">
                  <button className="btn" onClick={() => togglePublished(c)}>
                    {c.published ? "Offline nehmen" : "Veröffentlichen"}
                  </button>
                  <button className="btn danger" onClick={() => remove(c)}>
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

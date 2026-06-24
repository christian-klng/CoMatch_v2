import { useEffect, useState } from "react";
import type { AdminCommunity, AdminSession, AdminUserRow } from "./types";
import {
  clearToken,
  createCommunity,
  deleteCommunity,
  fetchAdminMe,
  getToken,
  listCommunities,
  listUsers,
  updateCommunity,
  UnauthorizedError,
} from "./api";
import { CommunityDetail } from "./CommunityDetail";
import { UserDetail } from "./UserDetail";
import { Login } from "./Login";

type Tab = "communities" | "users";

export function App() {
  // undefined = checking stored token, null = logged out, object = logged in.
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined);

  const checkSession = () => {
    if (!getToken()) {
      setSession(null);
      return;
    }
    fetchAdminMe()
      .then(setSession)
      .catch(() => setSession(null));
  };

  useEffect(checkSession, []);

  const logout = () => {
    clearToken();
    setSession(null);
  };

  if (session === undefined) {
    return (
      <div className="page">
        <p className="muted">Lädt…</p>
      </div>
    );
  }
  if (session === null) {
    return <Login onSuccess={checkSession} />;
  }

  return <Dashboard admin={session} onLogout={logout} />;
}

function Dashboard({ admin, onLogout }: { admin: AdminSession; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("communities");

  // Communities state
  const [communities, setCommunities] = useState<AdminCommunity[]>([]);
  const [commLoading, setCommLoading] = useState(true);
  const [commError, setCommError] = useState<string | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [creating, setCreating] = useState(false);

  // Users state
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // A 401 anywhere means the session expired — drop straight back to login.
  const onError = (e: unknown, fallback: (msg: string) => void, msg: string) => {
    if (e instanceof UnauthorizedError) onLogout();
    else fallback(msg);
  };

  const reloadCommunities = () => {
    setCommLoading(true);
    listCommunities()
      .then((rows) => { setCommunities(rows); setCommError(null); })
      .catch((e) => onError(e, setCommError, "Communities konnten nicht geladen werden."))
      .finally(() => setCommLoading(false));
  };

  const reloadUsers = (q = userQuery) => {
    setUserLoading(true);
    listUsers(q)
      .then((rows) => { setUsers(rows); setUserError(null); })
      .catch((e) => onError(e, setUserError, "Nutzer konnten nicht geladen werden."))
      .finally(() => setUserLoading(false));
  };

  useEffect(reloadCommunities, []);

  useEffect(() => {
    if (tab === "users") reloadUsers("");
  }, [tab]);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createCommunity({ name: name.trim(), context: context.trim() || undefined, published: publishNow });
      setName(""); setContext(""); setPublishNow(true);
      reloadCommunities();
    } catch (e) {
      onError(e, setCommError, "Community konnte nicht erstellt werden.");
    } finally {
      setCreating(false);
    }
  };

  const togglePublished = async (c: AdminCommunity) => {
    try { await updateCommunity(c.id, { published: !c.published }); reloadCommunities(); }
    catch (e) { onError(e, setCommError, "Status konnte nicht geändert werden."); }
  };

  const remove = async (c: AdminCommunity) => {
    if (!window.confirm(`Community „${c.name}" wirklich löschen?`)) return;
    try { await deleteCommunity(c.id); reloadCommunities(); }
    catch (e) { onError(e, setCommError, "Community konnte nicht gelöscht werden."); }
  };

  // Drill-down views
  const selectedCommunity = communities.find((c) => c.id === selectedCommunityId);
  if (selectedCommunity) {
    return <CommunityDetail community={selectedCommunity} onBack={() => setSelectedCommunityId(null)} />;
  }
  if (selectedUserId) {
    return <UserDetail userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
  }

  return (
    <div className="page">
      <header className="head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <h1>CoMatch Admin</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className="muted small">{admin.email}</span>
          <button className="btn" onClick={onLogout}>Abmelden</button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="tabs">
        <button className={`tab ${tab === "communities" ? "active" : ""}`} onClick={() => setTab("communities")}>
          Communities
        </button>
        <button className={`tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
          Nutzer
        </button>
      </div>

      {/* ── Communities ── */}
      {tab === "communities" && (
        <>
          {commError && <p className="alert">{commError}</p>}

          <section className="card">
            <h2>Neue Community</h2>
            <div className="form">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (z. B. TechFest Berlin 2025)" />
              <input value={context} onChange={(e) => setContext(e.target.value)} placeholder="Kontext (optional, z. B. Konferenz · 12.–13. Juni)" />
              <label className="check">
                <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
                Sofort veröffentlichen (beitretbar)
              </label>
              <button className="btn primary" onClick={create} disabled={!name.trim() || creating}>
                {creating ? "Erstelle…" : "Community erstellen"}
              </button>
            </div>
          </section>

          <section>
            <h2 className="list-title">Communities {!commLoading && `(${communities.length})`}</h2>
            {commLoading ? (
              <p className="muted">Lädt…</p>
            ) : communities.length === 0 ? (
              <p className="muted">Noch keine Community angelegt.</p>
            ) : (
              <div className="list">
                {communities.map((c) => (
                  <div key={c.id} className="row">
                    <button className="row-main row-link" onClick={() => setSelectedCommunityId(c.id)} title="Mitglieder anzeigen">
                      <div className="row-title">
                        <span className="cname">{c.name}</span>
                        {c.published ? <span className="tag live">live</span> : <span className="tag draft">Entwurf</span>}
                      </div>
                      {c.context && <p className="muted small">{c.context}</p>}
                      <p className="faint small">{c.memberCount} Mitglieder ›</p>
                    </button>
                    <div className="code-box">
                      <span className="code-label">Beitritts-Code</span>
                      <span className="code">{c.code}</span>
                    </div>
                    <div className="row-actions">
                      <button className="btn" onClick={() => togglePublished(c)}>{c.published ? "Offline nehmen" : "Veröffentlichen"}</button>
                      <button className="btn danger" onClick={() => remove(c)}>Löschen</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ── Nutzer ── */}
      {tab === "users" && (
        <>
          {userError && <p className="alert">{userError}</p>}

          <section className="card">
            <h2>Nutzer suchen</h2>
            <div className="form" style={{ flexDirection: "row", alignItems: "center" }}>
              <input
                style={{ flex: 1 }}
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && reloadUsers(userQuery)}
                placeholder="E-Mail oder Name…"
              />
              <button className="btn primary" onClick={() => reloadUsers(userQuery)}>Suchen</button>
              {userQuery && (
                <button className="btn" onClick={() => { setUserQuery(""); reloadUsers(""); }}>Zurücksetzen</button>
              )}
            </div>
          </section>

          <section>
            <h2 className="list-title">
              {userLoading ? "Lädt…" : `${users.length} Nutzer${userQuery ? ` für „${userQuery}"` : ""}`}
            </h2>

            {!userLoading && users.length === 0 && (
              <p className="muted">Keine Nutzer gefunden.</p>
            )}

            <div className="list">
              {users.map((u) => (
                <button
                  key={u.id}
                  className="user-row row-link"
                  onClick={() => setSelectedUserId(u.id)}
                >
                  <div className="row-title">
                    <span className="cname">{u.name ?? <em>Kein Name</em>}</span>
                    {u.communityCount > 0 && (
                      <span className="tag draft">{u.communityCount} Community{u.communityCount !== 1 ? "s" : ""}</span>
                    )}
                    {u.linkedinProfileRead ? (
                      <span className="tag live">LinkedIn</span>
                    ) : u.linkedinUrl ? (
                      <span className="tag draft" title="URL gespeichert, Profil noch nicht eingelesen">
                        LinkedIn-URL
                      </span>
                    ) : null}
                  </div>
                  <p className="muted small">{u.email ?? "–"}{u.role ? ` · ${u.role}` : ""}</p>
                  <p className="faint small">{new Date(u.createdAt).toLocaleDateString("de-DE")} ›</p>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

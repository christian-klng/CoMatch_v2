import { useEffect, useState } from "react";
import type { AdminCommunity, AdminMember } from "./types";
import { addMember, deleteMember, listMembers, seedMembers } from "./api";

export function CommunityDetail({
  community,
  onBack,
}: {
  community: AdminCommunity;
  onBack: () => void;
}) {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const reload = () => {
    setLoading(true);
    listMembers(community.id)
      .then((rows) => {
        setMembers(rows);
        setError(null);
      })
      .catch(() => setError("Mitglieder konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [community.id]);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addMember(community.id, { name: name.trim(), role: role.trim() || undefined });
      setName("");
      setRole("");
      reload();
    } catch {
      setError("Nutzer konnte nicht angelegt werden.");
    } finally {
      setBusy(false);
    }
  };

  const seed = async () => {
    setBusy(true);
    try {
      await seedMembers(community.id, 5);
      reload();
    } catch {
      setError("Testnutzer konnten nicht erzeugt werden.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: AdminMember) => {
    const extra =
      m.communityCount > 1
        ? `\n\nAchtung: in ${m.communityCount} Communities — wird überall entfernt.`
        : "";
    if (!window.confirm(`Nutzer „${m.name}" endgültig löschen?${extra}`)) return;
    try {
      await deleteMember(community.id, m.id);
      reload();
    } catch {
      setError("Nutzer konnte nicht gelöscht werden.");
    }
  };

  return (
    <div className="page">
      <button className="back" onClick={onBack}>
        ← Alle Communities
      </button>

      <header className="head">
        <h1>{community.name}</h1>
        <p className="muted">
          Beitritts-Code <span className="code-inline">{community.code}</span> ·{" "}
          {members.length} Mitglieder
        </p>
      </header>

      {error && <p className="alert">{error}</p>}

      <section className="card">
        <h2>Testnutzer anlegen</h2>
        <div className="form">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (z. B. Anna Beispiel)"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Rolle (optional, z. B. Designerin)"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <div className="row-actions">
            <button className="btn primary" onClick={add} disabled={!name.trim() || busy}>
              {busy ? "…" : "Nutzer hinzufügen"}
            </button>
            <button className="btn" onClick={seed} disabled={busy}>
              + 5 Zufalls-Testnutzer
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="list-title">Mitglieder {!loading && `(${members.length})`}</h2>

        {loading ? (
          <p className="muted">Lädt…</p>
        ) : members.length === 0 ? (
          <p className="muted">Noch keine Mitglieder.</p>
        ) : (
          <div className="list">
            {members.map((m) => (
              <div key={m.id} className="member">
                <div className="row-main">
                  <div className="row-title">
                    <span className="cname">{m.name}</span>
                    {m.communityCount > 1 && (
                      <span className="tag draft">{m.communityCount} Communities</span>
                    )}
                  </div>
                  <p className="muted small">
                    {m.role}
                    {m.company ? ` · ${m.company}` : ""}
                  </p>
                  {m.email && <p className="faint small">{m.email}</p>}
                </div>
                <button className="btn danger" onClick={() => remove(m)}>
                  Löschen
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

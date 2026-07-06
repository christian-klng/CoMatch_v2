import { useEffect, useState } from "react";
import type { AdminAccount } from "./types";
import {
  ApiError,
  createAdmin,
  deleteAdmin,
  listAdmins,
  updateAdmin,
  UnauthorizedError,
} from "./api";

// Super-admin-only roster management. The parent (App) only mounts this tab when
// the logged-in admin is a super-admin; the API additionally enforces it (403).
const MIN_PW = 8;

// API error codes → German messages. Anything unmapped falls back to a generic
// per-action message.
const ERROR_MESSAGES: Record<string, string> = {
  email_taken: "Diese E-Mail wird bereits verwendet.",
  invalid_email: "Bitte eine gültige E-Mail-Adresse eingeben.",
  password_too_short: `Das Passwort muss mindestens ${MIN_PW} Zeichen haben.`,
  last_super_admin: "Der letzte Super-Admin kann nicht entfernt oder herabgestuft werden.",
  cannot_delete_self: "Du kannst dein eigenes Konto nicht löschen.",
};

function messageFor(e: unknown, fallback: string): string {
  if (e instanceof ApiError && ERROR_MESSAGES[e.code]) return ERROR_MESSAGES[e.code];
  return fallback;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE");
}

export function AdminUsers({
  currentAdminId,
  onUnauthorized,
}: {
  currentAdminId: string;
  onUnauthorized: () => void;
}) {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Create form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSuper, setIsSuper] = useState(false);
  const [creating, setCreating] = useState(false);

  // Any 401 means the session expired — bounce to login. Otherwise show a
  // (possibly code-specific) error message.
  const handle = (e: unknown, fallback: string) => {
    if (e instanceof UnauthorizedError) return onUnauthorized();
    setNotice(null);
    setError(messageFor(e, fallback));
  };

  const reload = () => {
    setLoading(true);
    listAdmins()
      .then((rows) => { setAdmins(rows); setError(null); })
      .catch((e) => handle(e, "Admins konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const create = async () => {
    const em = email.trim();
    if (!em || !password) return;
    if (password.length < MIN_PW) {
      setError(ERROR_MESSAGES.password_too_short);
      return;
    }
    setCreating(true);
    try {
      await createAdmin({ email: em, password, isSuperAdmin: isSuper });
      setEmail(""); setPassword(""); setIsSuper(false);
      setError(null);
      setNotice(`Admin „${em}" angelegt.`);
      reload();
    } catch (e) {
      handle(e, "Admin konnte nicht angelegt werden.");
    } finally {
      setCreating(false);
    }
  };

  const toggleSuper = async (a: AdminAccount) => {
    const grant = !a.isSuperAdmin;
    if (
      !grant &&
      !window.confirm(`„${a.email}" den Super-Admin-Status entziehen?`)
    ) return;
    try {
      await updateAdmin(a.id, { isSuperAdmin: grant });
      setNotice(null);
      reload();
    } catch (e) {
      handle(e, "Status konnte nicht geändert werden.");
    }
  };

  const resetPassword = async (a: AdminAccount) => {
    const pw = window.prompt(`Neues Passwort für „${a.email}" (min. ${MIN_PW} Zeichen):`);
    if (pw === null) return; // cancelled
    if (pw.length < MIN_PW) {
      setError(ERROR_MESSAGES.password_too_short);
      return;
    }
    try {
      await updateAdmin(a.id, { password: pw });
      setError(null);
      setNotice(`Passwort für „${a.email}" geändert.`);
    } catch (e) {
      handle(e, "Passwort konnte nicht geändert werden.");
    }
  };

  const remove = async (a: AdminAccount) => {
    if (!window.confirm(`Admin „${a.email}" wirklich löschen?`)) return;
    try {
      await deleteAdmin(a.id);
      setNotice(null);
      reload();
    } catch (e) {
      handle(e, "Admin konnte nicht gelöscht werden.");
    }
  };

  const canSubmit = email.trim().length > 0 && password.length >= MIN_PW && !creating;

  return (
    <>
      {error && <p className="alert">{error}</p>}
      {notice && <p className="muted small">{notice}</p>}

      <section className="card">
        <h2>Neuer Admin</h2>
        <div className="form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canSubmit && create()}
            placeholder={`Passwort (min. ${MIN_PW} Zeichen)`}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={isSuper}
              onChange={(e) => setIsSuper(e.target.checked)}
            />
            Super-Admin (darf Admins verwalten)
          </label>
          <button className="btn primary" onClick={create} disabled={!canSubmit}>
            {creating ? "Lege an…" : "Admin anlegen"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="list-title">Admins {!loading && `(${admins.length})`}</h2>
        {loading ? (
          <p className="muted">Lädt…</p>
        ) : (
          <div className="list">
            {admins.map((a) => (
              <div key={a.id} className="member">
                <div style={{ minWidth: 0 }}>
                  <div className="row-title">
                    <span className="cname">{a.email}</span>
                    {a.isSuperAdmin && <span className="tag live">Super-Admin</span>}
                    {a.id === currentAdminId && <span className="tag draft">du</span>}
                  </div>
                  <p className="faint small">
                    angelegt {fmtDate(a.createdAt)}
                    {a.lastLoginAt
                      ? ` · zuletzt aktiv ${fmtDate(a.lastLoginAt)}`
                      : " · noch kein Login"}
                  </p>
                </div>
                <div className="row-actions" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button className="btn" onClick={() => toggleSuper(a)}>
                    {a.isSuperAdmin ? "Super-Admin entziehen" : "Zu Super-Admin"}
                  </button>
                  <button className="btn" onClick={() => resetPassword(a)}>
                    Passwort
                  </button>
                  {a.id !== currentAdminId && (
                    <button className="btn danger" onClick={() => remove(a)}>
                      Löschen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

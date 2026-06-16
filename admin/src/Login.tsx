import { useState } from "react";
import { login } from "./api";

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      onSuccess();
    } catch {
      setError("E-Mail oder Passwort falsch.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="head">
        <h1>CoMatch Admin</h1>
        <p className="muted">Bitte anmelden</p>
      </header>

      <section className="card">
        {error && <p className="alert">{error}</p>}
        <div className="form">
          <input
            type="email"
            value={email}
            autoFocus
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="E-Mail"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Passwort"
          />
          <button className="btn primary" onClick={submit} disabled={busy || !email.trim() || !password}>
            {busy ? "Anmelden…" : "Anmelden"}
          </button>
        </div>
      </section>
    </div>
  );
}

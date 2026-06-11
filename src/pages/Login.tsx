import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "./AuthShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Notice } from "../components/ui/Notice";
import { requestMagicLink } from "../lib/auth";
import { IconArrowRight, IconCheck } from "../components/icons";

export function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestMagicLink(email);
      setSent(true);
    } catch {
      setError("Konnte den Link nicht senden. Bitte versuche es erneut.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Willkommen zurück"
      subtitle="Melde dich per Login-Link an – kein Passwort nötig."
      footer={
        <>
          Noch kein Konto?{" "}
          <Link to="/register" className="font-medium text-brand-600">
            Registrieren
          </Link>
        </>
      }
    >
      {sent ? (
        <MagicLinkSent email={email} onReset={() => setSent(false)} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="E-Mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="du@firma.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <Notice>{error}</Notice>}
          <Button type="submit" fullWidth size="lg" disabled={busy || !email.trim()}>
            {busy ? "Sende Link…" : "Login-Link senden"}
            {!busy && <IconArrowRight width={18} height={18} />}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function MagicLinkSent({ email, onReset }: { email: string; onReset: () => void }) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <IconCheck width={28} height={28} />
      </div>
      <div>
        <h3 className="font-semibold text-ink">E-Mail unterwegs</h3>
        <p className="mt-1 text-sm text-muted">
          Wir haben einen Login-Link an <span className="font-medium text-ink-soft">{email}</span>{" "}
          geschickt. Öffne ihn auf diesem Gerät, um dich anzumelden. Der Link ist 15 Minuten gültig.
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="text-sm font-medium text-muted hover:text-ink-soft"
      >
        Andere E-Mail verwenden
      </button>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "./AuthShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { requestMagicLink } from "../lib/auth";
import { MagicLinkSent } from "./Login";
import { IconArrowRight } from "../components/icons";

export function Register() {
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
      title="Konto erstellen"
      subtitle="Gib deine E-Mail ein – wir schicken dir einen Login-Link. Deinen Namen und dein Profil legst du danach an."
      footer={
        <>
          Schon registriert?{" "}
          <Link to="/login" className="font-medium text-brand-600">
            Anmelden
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
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" fullWidth size="lg" disabled={busy || !email.trim()}>
            {busy ? "Sende Link…" : "Login-Link senden"}
            {!busy && <IconArrowRight width={18} height={18} />}
          </Button>
          <p className="text-center text-xs text-faint">
            Mit der Registrierung stimmst du den AGB & der Datenschutzerklärung zu.
          </p>
        </form>
      )}
    </AuthShell>
  );
}

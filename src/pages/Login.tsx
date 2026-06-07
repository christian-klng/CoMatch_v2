import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "./AuthShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { IconArrowRight } from "../components/icons";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Dummy: no real auth yet. Sends user into the scan/onboarding flow.
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/scan");
  };

  return (
    <AuthShell
      title="Willkommen zurück"
      subtitle="Melde dich an, um deine Matches zu sehen."
      footer={
        <>
          Noch kein Konto?{" "}
          <Link to="/register" className="font-medium text-brand-600">
            Registrieren
          </Link>
        </>
      }
    >
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
        <Input
          label="Passwort"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            type="button"
            className="text-sm font-medium text-muted hover:text-ink-soft"
          >
            Passwort vergessen?
          </button>
        </div>
        <Button type="submit" fullWidth size="lg">
          Anmelden
          <IconArrowRight width={18} height={18} />
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-border" />
        oder
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="secondary" fullWidth size="lg" onClick={() => navigate("/scan")}>
        Weiter mit LinkedIn
      </Button>
    </AuthShell>
  );
}

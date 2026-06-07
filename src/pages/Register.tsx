import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "./AuthShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { IconArrowRight } from "../components/icons";

export function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy: new users go straight to scanning a community QR.
    navigate("/scan");
  };

  return (
    <AuthShell
      title="Konto erstellen"
      subtitle="In 30 Sekunden startklar – dann scannst du deine Community."
      footer={
        <>
          Schon registriert?{" "}
          <Link to="/login" className="font-medium text-brand-600">
            Anmelden
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Name"
          autoComplete="name"
          placeholder="Vor- und Nachname"
          value={form.name}
          onChange={set("name")}
        />
        <Input
          label="E-Mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="du@firma.de"
          value={form.email}
          onChange={set("email")}
        />
        <Input
          label="Passwort"
          type="password"
          autoComplete="new-password"
          placeholder="Mind. 8 Zeichen"
          hint="Mindestens 8 Zeichen, eine Zahl."
          value={form.password}
          onChange={set("password")}
        />
        <Button type="submit" fullWidth size="lg">
          Konto erstellen
          <IconArrowRight width={18} height={18} />
        </Button>
        <p className="text-center text-xs text-faint">
          Mit der Registrierung stimmst du den AGB & der Datenschutzerklärung zu.
        </p>
      </form>
    </AuthShell>
  );
}

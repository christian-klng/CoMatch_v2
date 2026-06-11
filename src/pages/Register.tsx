import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "./AuthShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Notice } from "../components/ui/Notice";
import { requestMagicLink } from "../lib/auth";
import { MagicLinkSent } from "./Login";
import { IconArrowRight } from "../components/icons";

export function Register() {
  const { t } = useTranslation();
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
      setError(t("auth.login.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      footer={
        <>
          {t("auth.register.haveAccount")}{" "}
          <Link to="/login" className="font-medium text-brand-600">
            {t("auth.register.login")}
          </Link>
        </>
      }
    >
      {sent ? (
        <MagicLinkSent email={email} onReset={() => setSent(false)} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input
            label={t("common.email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("common.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <Notice>{error}</Notice>}
          <Button type="submit" fullWidth size="lg" disabled={busy || !email.trim()}>
            {busy ? t("auth.login.submitting") : t("auth.login.submit")}
            {!busy && <IconArrowRight width={18} height={18} />}
          </Button>
          <p className="text-center text-xs text-faint">
            {t("auth.register.terms")}
          </p>
        </form>
      )}
    </AuthShell>
  );
}

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
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

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
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
            />
            <span className="text-xs text-muted">
              {t("auth.register.privacyPre")}
              <a
                href="/datenschutz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 underline"
              >
                {t("auth.register.privacyLink")}
              </a>
              {t("auth.register.privacyPost")}
            </span>
          </label>
          <Button type="submit" fullWidth size="lg" disabled={busy || !email.trim() || !privacyAccepted}>
            {busy ? t("auth.login.submitting") : t("auth.login.submit")}
            {!busy && <IconArrowRight width={18} height={18} />}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

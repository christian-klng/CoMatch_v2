import { useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { AuthShell } from "./AuthShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Notice } from "../components/ui/Notice";
import { requestMagicLink } from "../lib/auth";
import { IconArrowRight, IconCheck } from "../components/icons";

export function Login() {
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
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <>
          {t("auth.login.noAccount")}{" "}
          <Link to="/register" className="font-medium text-brand-600">
            {t("auth.login.register")}
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
        </form>
      )}
    </AuthShell>
  );
}

export function MagicLinkSent({ email, onReset }: { email: string; onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <IconCheck width={28} height={28} />
      </div>
      <div>
        <h3 className="font-semibold text-ink">{t("auth.sent.title")}</h3>
        <p className="mt-1 text-sm text-muted">
          <Trans
            i18nKey="auth.sent.body"
            values={{ email }}
            components={{ strong: <span className="font-medium text-ink-soft" /> }}
          />
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="text-sm font-medium text-muted hover:text-ink-soft"
      >
        {t("auth.sent.reset")}
      </button>
    </div>
  );
}

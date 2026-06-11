import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ScreenHeader } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Notice } from "../components/ui/Notice";
import { Spinner } from "../components/ui/Spinner";
import { IconArrowRight, IconLink, IconSparkles } from "../components/icons";
import { apiSaveLinkedin, ApiError } from "../lib/api";
import { refreshUser } from "../lib/auth";

export function LinkedinConnect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = url.trim().length > 0 && consent && !busy;

  const connect = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      // Saves URL + consent and reads the LinkedIn profile (Unipile). Only move
      // on once the profile was actually loaded — so a typo'd URL is caught here
      // and the user can correct it, instead of landing on an empty Skills page.
      const res = await apiSaveLinkedin(url.trim(), consent);
      if (res.profileFetched) {
        // The import just replaced the placeholder name and avatar server-side
        // — refresh the in-memory user so Profile shows them without a reload.
        refreshUser();
        navigate("/skills");
        return;
      }
      setError(
        res.reason === "unipile_not_configured"
          ? t("linkedin.errorUnavailable")
          : t("linkedin.errorFetch"),
      );
      setBusy(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(t("linkedin.errorInvalidUrl"));
      } else {
        setError(t("linkedin.errorGeneric"));
      }
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <>
        <ScreenHeader title={t("linkedin.title")} subtitle={t("linkedin.subtitle")} />
        <div className="flex flex-col items-center justify-center gap-4 px-5 py-20 text-center">
          <Spinner />
          <p className="text-sm text-muted">{t("linkedin.loading")}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title={t("linkedin.title")} subtitle={t("linkedin.subtitle")} />

      <div className="px-5 py-5">
        <div className="animate-rise space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5">
            <IconSparkles width={20} height={20} className="mt-0.5 shrink-0 text-brand-600" />
            <p className="text-[13px] leading-relaxed text-brand-800">
              {t("linkedin.pitch")}
            </p>
          </div>

          <Input
            label={t("linkedin.urlLabel")}
            leftIcon={<IconLink width={18} height={18} />}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("linkedin.urlPlaceholder")}
            inputMode="url"
            autoCapitalize="none"
          />

          <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
            />
            <span>{t("linkedin.consent")}</span>
          </label>

          {error && <Notice>{error}</Notice>}

          <div className="space-y-2">
            <Button fullWidth size="lg" disabled={!canSubmit} onClick={connect}>
              {busy ? t("linkedin.connecting") : t("linkedin.connect")}
              {!busy && <IconArrowRight width={18} height={18} />}
            </Button>
            <Button
              fullWidth
              variant="ghost"
              disabled={busy}
              onClick={() => navigate("/skills")}
            >
              {t("linkedin.skip")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

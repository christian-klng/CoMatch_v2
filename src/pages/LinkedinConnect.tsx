import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Notice } from "../components/ui/Notice";
import { Spinner } from "../components/ui/Spinner";
import { IconArrowRight, IconLink, IconSparkles } from "../components/icons";
import { apiSaveLinkedin, ApiError } from "../lib/api";

export function LinkedinConnect() {
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
        navigate("/skills");
        return;
      }
      setError(
        res.reason === "unipile_not_configured"
          ? "Der LinkedIn-Import ist gerade nicht verfügbar. Du kannst trotzdem fortfahren und deine Skills selbst wählen."
          : "Wir konnten dein LinkedIn-Profil nicht laden. Prüfe deine URL (z. B. linkedin.com/in/deinname) und versuche es erneut – oder fahre ohne LinkedIn fort.",
      );
      setBusy(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("Bitte gib eine gültige LinkedIn-URL ein (z. B. linkedin.com/in/deinname).");
      } else {
        setError("Verbinden fehlgeschlagen. Bitte versuche es erneut.");
      }
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <>
        <ScreenHeader title="Verbinde mit LinkedIn" subtitle="Schneller starten – optional" />
        <div className="flex flex-col items-center justify-center gap-4 px-5 py-20 text-center">
          <Spinner />
          <p className="text-sm text-muted">Dein LinkedIn-Profil wird geladen…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenHeader
        title="Verbinde mit LinkedIn"
        subtitle="Schneller starten – optional"
      />

      <div className="px-5 py-5">
        <div className="animate-rise space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5">
            <IconSparkles width={20} height={20} className="mt-0.5 shrink-0 text-brand-600" />
            <p className="text-[13px] leading-relaxed text-brand-800">
              Verbinde dein LinkedIn-Profil, und wir schlagen dir passende Skills
              und „Ich suche"-Themen direkt vor. Du kannst das auch überspringen
              und alles selbst wählen.
            </p>
          </div>

          <Input
            label="Deine LinkedIn-URL"
            leftIcon={<IconLink width={18} height={18} />}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="linkedin.com/in/deinname – oder nur deinname"
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
            <span>
              Ich stimme zu, dass mein öffentliches LinkedIn-Profil ausgelesen und
              zur Verbesserung meiner Matches verarbeitet und gespeichert wird.
            </span>
          </label>

          {error && <Notice>{error}</Notice>}

          <div className="space-y-2">
            <Button fullWidth size="lg" disabled={!canSubmit} onClick={connect}>
              {busy ? "Profil wird geladen…" : "Verbinden"}
              {!busy && <IconArrowRight width={18} height={18} />}
            </Button>
            <Button
              fullWidth
              variant="ghost"
              disabled={busy}
              onClick={() => navigate("/skills")}
            >
              Überspringen
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

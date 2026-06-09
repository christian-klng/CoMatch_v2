import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { IconArrowRight, IconLink, IconSparkles } from "../components/icons";
import { apiGenerateSkillSuggestions, apiSaveLinkedin, ApiError } from "../lib/api";

export function LinkedinConnect() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = url.trim().length > 0 && consent && !busy;

  const connect = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const { profileFetched } = await apiSaveLinkedin(url.trim(), consent);
      if (profileFetched) {
        // Read the profile with AI and pre-fill skill suggestions. Best-effort:
        // if it fails, the user just lands on an empty skills screen.
        setAnalyzing(true);
        await apiGenerateSkillSuggestions().catch((err) =>
          console.error("[linkedin] suggestion generation failed", err),
        );
      }
      navigate("/skills");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("Bitte gib eine gültige LinkedIn-URL ein (z. B. linkedin.com/in/deinname).");
      } else {
        setError("Verbinden fehlgeschlagen. Bitte versuche es erneut.");
      }
      setBusy(false);
      setAnalyzing(false);
    }
  };

  if (busy) {
    return (
      <>
        <ScreenHeader title="Verbinde mit LinkedIn" subtitle="Schneller starten – optional" />
        <div className="flex flex-col items-center justify-center gap-4 px-5 py-20 text-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-muted">
            {analyzing
              ? "KI analysiert dein Profil und schlägt passende Skills vor…"
              : "Dein LinkedIn-Profil wird geladen…"}
          </p>
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-soft">Deine LinkedIn-URL</label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <IconLink width={18} height={18} className="shrink-0 text-faint" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="linkedin.com/in/deinname"
                inputMode="url"
                autoCapitalize="none"
                className="h-11 flex-1 bg-transparent text-[15px] placeholder:text-faint focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-brand-600 focus:ring-brand-500/30"
            />
            <span>
              Ich stimme zu, dass mein öffentliches LinkedIn-Profil ausgelesen und
              zur Verbesserung meiner Matches verarbeitet und gespeichert wird.
            </span>
          </label>

          {error && (
            <p className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
          )}

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

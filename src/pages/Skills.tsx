import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import { cn } from "../lib/cn";
import {
  apiCreateSkill,
  apiGenerateSkillSuggestions,
  apiGetMySkills,
  apiGetSkillSuggestions,
  apiSaveMySkills,
  fetchSkills,
  type SkillOption,
  type SkillSuggestions,
} from "../lib/api";
import { refreshSkillsStatus } from "../lib/skills";
import { IconArrowRight, IconGift, IconPlus, IconSearch } from "../components/icons";

type Mode = "seek" | "offer";

export function Skills() {
  const navigate = useNavigate();
  const [seeks, setSeeks] = useState<Set<string>>(new Set());
  const [offers, setOffers] = useState<Set<string>>(new Set());
  const [suggSeeks, setSuggSeeks] = useState<Set<string>>(new Set());
  const [suggOffers, setSuggOffers] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("seek");
  const [catalog, setCatalog] = useState<SkillOption[]>([]);
  const [saving, setSaving] = useState(false);
  // 'analyzing' = the LLM is reading the LinkedIn profile into chip suggestions.
  const [phase, setPhase] = useState<"loading" | "analyzing" | "ready">("loading");

  // Catalog + the user's saved selection + AI suggestions from their LinkedIn
  // profile. If a profile was read but not yet analysed, generate suggestions
  // now (with a spinner). If nothing is saved yet, pre-select the suggestions.
  useEffect(() => {
    let cancelled = false;

    fetchSkills()
      .then((c) => !cancelled && setCatalog(c))
      .catch((err) => console.error("[skills] catalog load failed", err));

    (async () => {
      try {
        const [saved, sugg] = await Promise.all([
          apiGetMySkills(),
          apiGetSkillSuggestions(),
        ]);
        if (cancelled) return;

        const savedEmpty = saved.seeks.length === 0 && saved.offers.length === 0;
        setSeeks(new Set(saved.seeks));
        setOffers(new Set(saved.offers));

        const applySugg = (s: SkillSuggestions) => {
          if (cancelled) return;
          setSuggSeeks(new Set(s.seeks));
          setSuggOffers(new Set(s.offers));
          // Only pre-select suggestions during onboarding (no saved choice yet).
          if (savedEmpty) {
            setSeeks(new Set(s.seeks));
            setOffers(new Set(s.offers));
          }
        };

        if (sugg.generated) {
          applySugg(sugg);
        } else if (sugg.profileReady) {
          // Profile read but not analysed yet → run the LLM now, with a spinner.
          setPhase("analyzing");
          try {
            applySugg(await apiGenerateSkillSuggestions());
          } catch (err) {
            console.error("[skills] suggestion generation failed", err);
          }
        }
      } catch (err) {
        console.error("[skills] selection/suggestions load failed", err);
      } finally {
        if (!cancelled) setPhase("ready");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const active = mode === "seek" ? seeks : offers;
  const setActive = mode === "seek" ? setSeeks : setOffers;
  const activeSugg = mode === "seek" ? suggSeeks : suggOffers;
  const hasSuggestions = suggSeeks.size > 0 || suggOffers.size > 0;

  const toggle = (id: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Free-text entry: canonicalise via the API, add the chip to the catalog if
  // it's new, and select it for the active mode.
  const [custom, setCustom] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  const addCustom = async () => {
    const label = custom.trim();
    if (!label || addingCustom) return;
    setAddingCustom(true);
    try {
      const skill = await apiCreateSkill(label);
      setCatalog((prev) =>
        prev.some((s) => s.id === skill.id) ? prev : [...prev, skill],
      );
      setActive((prev) => new Set(prev).add(skill.id));
      setCustom("");
    } catch (err) {
      console.error("[skills] custom skill add failed", err);
    } finally {
      setAddingCustom(false);
    }
  };

  const total = seeks.size + offers.size;

  const save = async () => {
    setSaving(true);
    try {
      await apiSaveMySkills([...seeks], [...offers]);
      // Await the refresh so the skills gate sees the new selection before we
      // navigate into a gated route (otherwise it bounces back to /skills).
      await refreshSkillsStatus();
      navigate("/matches");
    } catch (err) {
      console.error("[skills] save failed", err);
      setSaving(false);
    }
  };

  return (
    <>
      <ScreenHeader
        title="Deine Skills"
        subtitle="Was suchst du – was kannst du anbieten?"
      />

      <div className="px-5 py-5 pb-40">
        {phase === "analyzing" ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <Spinner />
            <p className="text-sm text-muted">
              KI liest dein LinkedIn-Profil und schlägt passende Skills vor…
            </p>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-2 p-1">
              <ModeTab
                active={mode === "seek"}
                onClick={() => setMode("seek")}
                icon={<IconSearch width={17} height={17} />}
                label="Ich suche"
                count={seeks.size}
                tone="seek"
              />
              <ModeTab
                active={mode === "offer"}
                onClick={() => setMode("offer")}
                icon={<IconGift width={17} height={17} />}
                label="Ich kann"
                count={offers.size}
                tone="offer"
              />
            </div>

            {/* Free-text entry for the active mode */}
            <Input
              className="mb-4"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addCustom();
                }
              }}
              placeholder={
                mode === "seek"
                  ? "Eigenen Eintrag hinzufügen – was suchst du?"
                  : "Eigenen Eintrag hinzufügen – was kannst du?"
              }
              maxLength={80}
              rightSlot={
                <button
                  onClick={() => void addCustom()}
                  disabled={!custom.trim() || addingCustom}
                  aria-label="Skill hinzufügen"
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition-all active:scale-95 disabled:opacity-40",
                    mode === "seek"
                      ? "bg-[var(--color-seek)]"
                      : "bg-[var(--color-offer)]",
                  )}
                >
                  <IconPlus width={16} height={16} />
                </button>
              }
            />

            {/* AI suggestion hint */}
            {hasSuggestions && (
              <p className="mb-3 text-[13px] leading-relaxed text-muted">
                Die markierten Chips stammen aus deinem LinkedIn-Profil – passe sie
                gern an.
              </p>
            )}

            {/* Chips */}
            <div className="flex flex-wrap gap-2">
              {catalog.map(({ id, label }) => {
                const on = active.has(id);
                const suggested = activeSugg.has(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggle(id)}
                    className={cn(
                      "relative rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-95",
                      on
                        ? mode === "seek"
                          ? "border-transparent bg-[var(--color-seek)] text-white shadow-sm"
                          : "border-transparent bg-[var(--color-offer)] text-white shadow-sm"
                        : "border-border bg-surface text-ink-soft hover:border-border-strong"
                    )}
                  >
                    {label}
                    {suggested && (
                      <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                        <span
                          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                          style={{ backgroundColor: "#f59e0b" }}
                        />
                        <span
                          className="relative inline-flex h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: "#f59e0b" }}
                        />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Sticky CTA — hidden while the LLM is still analyzing the profile. */}
      {phase !== "analyzing" && (
      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-20 mx-auto w-full max-w-[440px] border-t border-border bg-surface/90 px-5 py-3 backdrop-blur-md">
        <Button fullWidth size="lg" disabled={total === 0 || saving} onClick={save}>
          {total === 0
            ? "Wähle mindestens einen Skill"
            : saving
              ? "Speichere…"
              : `Matches finden (${total} gewählt)`}
          {total > 0 && !saving && <IconArrowRight width={18} height={18} />}
        </Button>
      </div>
      )}
    </>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  tone: "seek" | "offer";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
        active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink-soft"
      )}
    >
      <span
        className={cn(
          active &&
            (tone === "seek" ? "text-[var(--color-seek)]" : "text-[var(--color-offer)]")
        )}
      >
        {icon}
      </span>
      {label}
      {count > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 text-xs font-bold text-white",
            tone === "seek" ? "bg-[var(--color-seek)]" : "bg-[var(--color-offer)]"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/cn";
import {
  apiGetMySkills,
  apiGetSkillSuggestions,
  apiSaveMySkills,
  fetchSkills,
  type SkillOption,
} from "../lib/api";
import { IconArrowRight, IconGift, IconSearch, IconSparkles } from "../components/icons";

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

  // Catalog + the user's saved selection + AI suggestions from their LinkedIn
  // profile. If nothing is saved yet (onboarding), pre-select the suggestions.
  useEffect(() => {
    fetchSkills()
      .then(setCatalog)
      .catch((err) => console.error("[skills] catalog load failed", err));
    Promise.all([apiGetMySkills(), apiGetSkillSuggestions()])
      .then(([saved, sugg]) => {
        setSuggSeeks(new Set(sugg.seeks));
        setSuggOffers(new Set(sugg.offers));
        const savedEmpty = saved.seeks.length === 0 && saved.offers.length === 0;
        setSeeks(new Set(savedEmpty ? sugg.seeks : saved.seeks));
        setOffers(new Set(savedEmpty ? sugg.offers : saved.offers));
      })
      .catch((err) => console.error("[skills] selection/suggestions load failed", err));
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

  const total = seeks.size + offers.size;

  const save = async () => {
    setSaving(true);
    try {
      await apiSaveMySkills([...seeks], [...offers]);
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
        {/* LLM assist hint (future) */}
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5">
          <IconSparkles width={20} height={20} className="mt-0.5 shrink-0 text-brand-600" />
          <p className="text-[13px] leading-relaxed text-brand-800">
            Bald hilft dir ein Assistent, deine Ziele in passende Skills zu
            übersetzen. Für jetzt: einfach antippen.
          </p>
        </div>

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
      </div>

      {/* Sticky CTA */}
      <div className="safe-bottom fixed inset-x-0 bottom-[68px] z-20 mx-auto w-full max-w-[440px] border-t border-border bg-bg/90 px-5 py-3 backdrop-blur-md">
        <Button fullWidth size="lg" disabled={total === 0 || saving} onClick={save}>
          {total === 0
            ? "Wähle mindestens einen Skill"
            : saving
              ? "Speichere…"
              : `Matches finden (${total} gewählt)`}
          {total > 0 && !saving && <IconArrowRight width={18} height={18} />}
        </Button>
      </div>
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

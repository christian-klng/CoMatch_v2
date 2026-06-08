import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/cn";
import { apiGetMySkills, apiSaveMySkills, fetchSkills, type SkillOption } from "../lib/api";
import { IconArrowRight, IconGift, IconSearch, IconSparkles } from "../components/icons";

type Mode = "seek" | "offer";

export function Skills() {
  const navigate = useNavigate();
  const [seeks, setSeeks] = useState<Set<string>>(new Set());
  const [offers, setOffers] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("seek");
  const [catalog, setCatalog] = useState<SkillOption[]>([]);
  const [saving, setSaving] = useState(false);

  // Controlled skill vocabulary + the user's previously saved selection.
  useEffect(() => {
    fetchSkills()
      .then(setCatalog)
      .catch((err) => console.error("[skills] catalog load failed", err));
    apiGetMySkills()
      .then(({ seeks, offers }) => {
        setSeeks(new Set(seeks));
        setOffers(new Set(offers));
      })
      .catch((err) => console.error("[skills] saved selection load failed", err));
  }, []);

  const active = mode === "seek" ? seeks : offers;
  const setActive = mode === "seek" ? setSeeks : setOffers;

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

        {/* Chips */}
        <div className="flex flex-wrap gap-2">
          {catalog.map(({ id, label }) => {
            const on = active.has(id);
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-95",
                  on
                    ? mode === "seek"
                      ? "border-transparent bg-[var(--color-seek)] text-white shadow-sm"
                      : "border-transparent bg-[var(--color-offer)] text-white shadow-sm"
                    : "border-border bg-surface text-ink-soft hover:border-border-strong"
                )}
              >
                {label}
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

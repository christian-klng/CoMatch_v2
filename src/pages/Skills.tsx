import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/cn";
import { SKILL_CATALOG } from "../lib/mockData";
import {
  IconArrowRight,
  IconGift,
  IconPlus,
  IconSearch,
  IconSparkles,
} from "../components/icons";

type Mode = "seek" | "offer";

export function Skills() {
  const navigate = useNavigate();
  const [seeks, setSeeks] = useState<Set<string>>(new Set());
  const [offers, setOffers] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("seek");

  const active = mode === "seek" ? seeks : offers;
  const setActive = mode === "seek" ? setSeeks : setOffers;

  const toggle = (label: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const addCustom = () => {
    const label = custom.trim();
    if (!label) return;
    if (!extra.includes(label)) setExtra((e) => [...e, label]);
    setActive((prev) => new Set(prev).add(label));
    setCustom("");
  };

  const options = useMemo(
    () => [...SKILL_CATALOG.map((s) => s.label), ...extra],
    [extra]
  );

  const total = seeks.size + offers.size;

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
          {options.map((label) => {
            const on = active.has(label);
            return (
              <button
                key={label}
                onClick={() => toggle(label)}
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

        {/* Custom add */}
        <div className="mt-5 flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder={
              mode === "seek" ? "Etwas anderes gesucht?" : "Etwas anderes anzubieten?"
            }
            className="h-11 flex-1 rounded-md border border-border bg-surface px-3.5 text-[15px] placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <Button variant="secondary" onClick={addCustom} disabled={!custom.trim()}>
            <IconPlus width={18} height={18} />
          </Button>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="safe-bottom fixed inset-x-0 bottom-[68px] z-20 mx-auto w-full max-w-[440px] border-t border-border bg-bg/90 px-5 py-3 backdrop-blur-md">
        <Button
          fullWidth
          size="lg"
          disabled={total === 0}
          onClick={() => navigate("/matches")}
        >
          {total === 0
            ? "Wähle mindestens einen Skill"
            : `Matches finden (${total} gewählt)`}
          {total > 0 && <IconArrowRight width={18} height={18} />}
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

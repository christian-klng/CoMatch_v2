import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { ScoreRing } from "../components/ScoreRing";
import { IconArrowLeft, IconLogo } from "../components/icons";

export function Styleguide() {
  return (
    <div className="mx-auto min-h-full max-w-3xl px-6 py-10">
      <Link
        to="/profile"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
      >
        <IconArrowLeft width={18} height={18} /> Zurück
      </Link>

      <div className="mb-10 flex items-center gap-3">
        <IconLogo />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            CoMatch Styleguide
          </h1>
          <p className="text-sm text-muted">
            Professional & Clean · v0.1 Design-Tokens
          </p>
        </div>
      </div>

      <Section title="Marken-Farben">
        <Swatches
          items={[
            ["brand-600", "#2563eb", true],
            ["brand-700", "#1d4fd7", true],
            ["brand-100", "#dbe7fe", false],
            ["brand-50", "#eff5ff", false],
          ]}
        />
      </Section>

      <Section title="Skill-Akzente">
        <Swatches
          items={[
            ["seek (ich suche)", "var(--color-seek)", true],
            ["offer (ich kann)", "var(--color-offer)", true],
          ]}
        />
      </Section>

      <Section title="Neutrale / Text">
        <Swatches
          items={[
            ["ink", "#0f172a", true],
            ["ink-soft", "#334155", true],
            ["muted", "#64748b", true],
            ["border", "#e2e8f0", false],
            ["bg", "#f8fafc", false],
          ]}
        />
      </Section>

      <Section title="Semantik">
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="brand">Brand</Badge>
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="seek">Suche</Badge>
          <Badge tone="offer">Kann</Badge>
        </div>
      </Section>

      <Section title="Typografie (Inter)">
        <div className="space-y-2">
          <p className="text-[28px] font-semibold tracking-tight text-ink">
            Display · 28 / Semibold
          </p>
          <p className="text-[22px] font-semibold tracking-tight text-ink">
            Heading · 22 / Semibold
          </p>
          <p className="text-base text-ink-soft">Body · 16 / Regular</p>
          <p className="text-sm text-muted">Caption · 14 / Muted</p>
          <p className="text-xs text-faint">Micro · 12 / Faint</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Eingabefelder">
        <div className="max-w-sm space-y-3">
          <Input label="E-Mail" placeholder="du@firma.de" />
          <Input label="Mit Hinweis" placeholder="…" hint="Hilfetext darunter." />
        </div>
      </Section>

      <Section title="Radius & Elevation">
        <div className="flex flex-wrap gap-4">
          {(["sm", "md", "lg", "xl", "2xl"] as const).map((r) => (
            <div key={r} className="text-center">
              <div
                className="h-16 w-16 border border-border bg-surface shadow-sm"
                style={{ borderRadius: `var(--radius-${r})` }}
              />
              <span className="mt-1 block text-xs text-muted">{r}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-4">
          {(["xs", "sm", "md", "lg"] as const).map((s) => (
            <div key={s} className="text-center">
              <div
                className="h-16 w-16 rounded-lg bg-surface"
                style={{ boxShadow: `var(--shadow-${s})` }}
              />
              <span className="mt-1 block text-xs text-muted">shadow-{s}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Komponenten">
        <div className="flex flex-wrap items-center gap-6">
          <ScoreRing score={94} />
          <ScoreRing score={82} />
          <ScoreRing score={68} />
          <Card className="px-4 py-3 text-sm text-ink-soft">Card-Surface</Card>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatches({ items }: { items: [string, string, boolean][] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map(([name, value, dark]) => (
        <div key={name} className="w-28">
          <div
            className="flex h-16 items-end rounded-lg border border-border p-2 text-[11px] font-medium"
            style={{ background: value, color: dark ? "#fff" : "#0f172a" }}
          >
            {name}
          </div>
          <span className="mt-1 block text-[11px] text-muted">{value}</span>
        </div>
      ))}
    </div>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Person } from "../lib/types";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Avatar } from "./ui/Avatar";
import { ConnectionBadge } from "./ConnectAction";
import { cn } from "../lib/cn";
import { CONNECTION_GATING } from "../lib/featureFlags";
import { ScoreRing } from "./ScoreRing";
import { IconGift, IconSearch } from "./icons";

export function MatchCard({ person }: { person: Person }) {
  const { t } = useTranslation();
  // Identity (name + photo) is revealed only once both sides are connected;
  // until then the server sends masked data and we render it pixelated.
  // (No-op while the gating feature is switched off — see featureFlags.)
  const hidden = CONNECTION_GATING && person.connection !== "connected";
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <Link to={`/matches/${person.id}`} className="block p-4">
        <div className="flex items-start gap-3.5">
          <Avatar
            src={person.avatarUrl}
            name={person.name}
            size="lg"
            className={hidden ? "blur-[3px]" : undefined}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3
                  className={cn(
                    "truncate font-semibold text-ink",
                    hidden && "select-none blur-[2px]"
                  )}
                >
                  {person.name}
                </h3>
                {person.role && (
                  <p className="truncate text-sm text-ink-soft">{person.role}</p>
                )}
                {person.company && (
                  <p className="truncate text-xs text-muted">
                    {person.company}
                  </p>
                )}
              </div>
              <ScoreRing score={person.matchScore} />
            </div>
          </div>
        </div>

        {/* Why matched */}
        <div className="mt-3.5 space-y-1.5">
          {person.matchedOn.theyOffer.length > 0 && (
            <Row
              icon={<IconGift width={14} height={14} />}
              tone="offer"
              label={t("matchCard.theyOffer")}
              items={person.matchedOn.theyOffer}
            />
          )}
          {person.matchedOn.theySeek.length > 0 && (
            <Row
              icon={<IconSearch width={14} height={14} />}
              tone="seek"
              label={t("matchCard.theySeek")}
              items={person.matchedOn.theySeek}
            />
          )}
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {person.attributes.slice(0, 2).map((a) => (
            <Badge key={a}>{a}</Badge>
          ))}
        </div>
        {CONNECTION_GATING && <ConnectionBadge status={person.connection} />}
      </div>
    </Card>
  );
}

function Row({
  icon,
  tone,
  label,
  items,
}: {
  icon: React.ReactNode;
  tone: "seek" | "offer";
  label: string;
  items: string[];
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="shrink-0"
        style={{
          color:
            tone === "seek" ? "var(--color-seek)" : "var(--color-offer)",
        }}
      >
        {icon}
      </span>
      <span className="shrink-0 text-muted">{label}:</span>
      <span className="truncate font-medium text-ink-soft">
        {items.join(", ")}
      </span>
    </div>
  );
}

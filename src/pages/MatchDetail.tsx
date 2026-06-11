import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMatch } from "../lib/matchStore";
import { cn } from "../lib/cn";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { ConnectAction } from "../components/ConnectAction";
import { ScoreRing } from "../components/ScoreRing";
import {
  IconArrowLeft,
  IconGift,
  IconLink,
  IconSearch,
} from "../components/icons";

export function MatchDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const person = useMatch(id);
  // Identity (name + photo) is revealed only once both sides are connected.
  const hidden = person != null && person.connection !== "connected";

  if (!person) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="text-muted">{t("matchDetail.notFound")}</p>
        <Link to="/matches" className="font-medium text-brand-600">
          {t("matchDetail.backToMatches")}
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header band */}
      <div className="safe-top relative bg-brand-600 px-5 pb-16 pt-4 text-white">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white"
        >
          <IconArrowLeft width={18} height={18} /> {t("common.back")}
        </button>
      </div>

      <div className="-mt-12 px-5">
        <div className="relative rounded-2xl border border-border bg-surface p-5 pt-14 shadow-md">
          {/* Avatar overlaps the blue band; name sits on white below it. */}
          <div className="absolute -top-10 left-5">
            <Avatar
              src={person.avatarUrl}
              name={person.name}
              size="xl"
              className={cn("ring-4 ring-surface", hidden && "blur-[5px]")}
            />
          </div>
          <div className="absolute right-5 top-5">
            <ScoreRing score={person.matchScore} />
          </div>

          <h1
            className={cn(
              "text-xl font-semibold text-ink",
              hidden && "select-none blur-[3px]"
            )}
          >
            {person.name}
          </h1>
          {person.role && <p className="text-sm text-ink-soft">{person.role}</p>}
          {person.company && (
            <p className="text-sm text-muted">{person.company}</p>
          )}
          {hidden && (
            <p className="mt-1 text-xs text-faint">{t("matchDetail.hiddenHint")}</p>
          )}

          {person.bio && (
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              {person.bio}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {person.attributes.map((a) => (
              <Badge key={a}>{a}</Badge>
            ))}
          </div>

          <div className="mt-5">
            <ConnectAction person={person} size="md" />
          </div>
        </div>

        {/* Skills detail */}
        <div className="mt-4 space-y-3 pb-10">
          <SkillBlock
            title={t("matchDetail.seeks")}
            icon={<IconSearch width={16} height={16} />}
            tone="seek"
            items={person.seeks}
            highlight={person.matchedOn.theySeek}
          />
          <SkillBlock
            title={t("matchDetail.offers")}
            icon={<IconGift width={16} height={16} />}
            tone="offer"
            items={person.offers}
            highlight={person.matchedOn.theyOffer}
          />

          <div className="rounded-xl border border-border bg-surface-2/60 p-4 text-sm text-muted">
            <p className="flex items-center gap-2 font-medium text-ink-soft">
              <IconLink width={15} height={15} /> {t("matchDetail.afterConnectTitle")}
            </p>
            <p className="mt-1">{t("matchDetail.afterConnectBody")}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function SkillBlock({
  title,
  icon,
  tone,
  items,
  highlight,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "seek" | "offer";
  items: string[];
  highlight: string[];
}) {
  const color = tone === "seek" ? "var(--color-seek)" : "var(--color-offer)";
  return (
    <Card className="p-4">
      <p
        className="mb-2.5 flex items-center gap-2 text-sm font-semibold"
        style={{ color }}
      >
        {icon} {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} tone={tone}>
            {highlight.includes(item) && "★ "}
            {item}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

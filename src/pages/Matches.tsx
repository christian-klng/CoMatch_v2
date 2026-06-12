import { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ScreenHeader } from "../components/AppShell";
import { MatchCard } from "../components/MatchCard";
import { Badge } from "../components/ui/Badge";
import { refreshMatches, useMatches, useMatchesStatus } from "../lib/matchStore";
import { useMyCommunities } from "../lib/community";
import { CONNECTION_GATING, MAX_VISIBLE_MATCHES } from "../lib/featureFlags";
import { IconSparkles } from "../components/icons";

export function Matches() {
  const { t } = useTranslation();
  const matches = useMatches();
  const status = useMatchesStatus();
  const { communities } = useMyCommunities();

  // The pool can change while the app is open (new community, edited skills,
  // incoming requests), so re-fetch on every visit and then poll every 30s
  // while the page is open — but only when the tab is actually visible.
  // Cached data stays visible during each refresh.
  useEffect(() => {
    void refreshMatches();
    const tick = () => {
      if (document.visibilityState === "visible") void refreshMatches();
    };
    const interval = setInterval(tick, 30_000);
    // Refresh immediately when the user returns to the tab instead of
    // waiting for the next interval.
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const subtitle =
    communities.length === 1
      ? communities[0].name
      : t("matches.communities", { count: communities.length });
  // Incoming requests first (they want something from you — don't bury them
  // under high scores), then best matches.
  const sorted = [...matches].sort(
    (a, b) =>
      Number(b.connection === "incoming") - Number(a.connection === "incoming") ||
      b.matchScore - a.matchScore,
  );
  // Test phase: render only the top N (badge counts what's rendered).
  const shown = sorted.slice(0, MAX_VISIBLE_MATCHES);
  const incoming = shown.filter((m) => m.connection === "incoming");

  return (
    <>
      <ScreenHeader
        title={t("matches.title")}
        subtitle={subtitle}
        right={
          <Badge tone="brand">
            <IconSparkles width={13} height={13} /> {shown.length}
          </Badge>
        }
      />

      <div className="space-y-4 px-5 py-5">
        {CONNECTION_GATING && incoming.length > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning-soft/50 px-4 py-3 text-sm text-warning">
            <Trans
              i18nKey="matches.incoming"
              count={incoming.length}
              components={{ strong: <span className="font-semibold" /> }}
            />
          </div>
        )}

        {status === "loading" ? (
          <LoadingState />
        ) : status === "error" ? (
          <ErrorState />
        ) : shown.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {shown.map((person, i) => (
              <div
                key={person.id}
                className="animate-rise"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <MatchCard person={person} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl border border-border bg-surface-2/60"
        />
      ))}
    </div>
  );
}

function ErrorState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h3 className="font-semibold text-ink">{t("matches.errorTitle")}</h3>
      <p className="max-w-[260px] text-sm text-muted">{t("matches.errorBody")}</p>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-faint">
        <IconSparkles width={26} height={26} />
      </div>
      <h3 className="font-semibold text-ink">{t("matches.emptyTitle")}</h3>
      <p className="max-w-[260px] text-sm text-muted">{t("matches.emptyBody")}</p>
    </div>
  );
}

import { useEffect } from "react";
import { ScreenHeader } from "../components/AppShell";
import { MatchCard } from "../components/MatchCard";
import { Badge } from "../components/ui/Badge";
import { refreshMatches, useMatches, useMatchesStatus } from "../lib/matchStore";
import { useMyCommunities } from "../lib/community";
import { IconSparkles } from "../components/icons";

export function Matches() {
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
      : `${communities.length} Communities`;
  // Incoming requests first (they want something from you — don't bury them
  // under high scores), then best matches.
  const sorted = [...matches].sort(
    (a, b) =>
      Number(b.connection === "incoming") - Number(a.connection === "incoming") ||
      b.matchScore - a.matchScore,
  );
  const incoming = sorted.filter((m) => m.connection === "incoming");

  return (
    <>
      <ScreenHeader
        title="Deine Matches"
        subtitle={subtitle}
        right={
          <Badge tone="brand">
            <IconSparkles width={13} height={13} /> {sorted.length}
          </Badge>
        }
      />

      <div className="space-y-4 px-5 py-5">
        {incoming.length > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning-soft/50 px-4 py-3 text-sm text-warning">
            <span className="font-semibold">{incoming.length} neue Anfrage{incoming.length > 1 ? "n" : ""}</span>{" "}
            warten auf dich.
          </div>
        )}

        {status === "loading" ? (
          <LoadingState />
        ) : status === "error" ? (
          <ErrorState />
        ) : sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {sorted.map((person, i) => (
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
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h3 className="font-semibold text-ink">Matches konnten nicht geladen werden</h3>
      <p className="max-w-[260px] text-sm text-muted">
        Die Verbindung zur API ist fehlgeschlagen. Prüfe deine Internetverbindung
        und versuche es später erneut.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-faint">
        <IconSparkles width={26} height={26} />
      </div>
      <h3 className="font-semibold text-ink">Noch keine Matches</h3>
      <p className="max-w-[260px] text-sm text-muted">
        Sobald mehr Leute in deiner Community ihre Skills angeben, erscheinen
        hier deine besten Matches.
      </p>
    </div>
  );
}

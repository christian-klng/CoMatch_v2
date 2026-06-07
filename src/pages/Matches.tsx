import { ScreenHeader } from "../components/AppShell";
import { MatchCard } from "../components/MatchCard";
import { Badge } from "../components/ui/Badge";
import { useMatches } from "../lib/matchStore";
import { CURRENT_COMMUNITY } from "../lib/mockData";
import { IconSparkles } from "../components/icons";

export function Matches() {
  const matches = useMatches();
  const sorted = [...matches].sort((a, b) => b.matchScore - a.matchScore);
  const incoming = sorted.filter((m) => m.connection === "incoming");

  return (
    <>
      <ScreenHeader
        title="Deine Matches"
        subtitle={CURRENT_COMMUNITY.name}
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

        {sorted.length === 0 ? (
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

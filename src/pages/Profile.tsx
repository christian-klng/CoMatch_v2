import { Link, useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppShell";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { logout, useAuth } from "../lib/auth";
import { useMyCommunities } from "../lib/community";
import { IconArrowRight, IconUsers } from "../components/icons";

export function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { communities } = useMyCommunities();
  const displayName = user?.name ?? user?.email ?? "Du";
  const subtitle = [user?.role, user?.company].filter(Boolean).join(" · ");

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <ScreenHeader title="Profil" />
      <div className="space-y-4 px-5 py-5">
        <Card className="flex items-center gap-4 p-5">
          <Avatar
            src={user?.avatarUrl ?? undefined}
            name={displayName}
            size="lg"
          />
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-ink">{displayName}</h2>
            <p className="truncate text-sm text-muted">
              {subtitle || "Profil noch nicht vervollständigt"}
            </p>
            <button className="mt-1 text-sm font-medium text-brand-600">
              Profil bearbeiten
            </button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">
              Meine Communities
              {communities.length > 0 && (
                <span className="ml-1 text-muted">({communities.length})</span>
              )}
            </p>
            <Button size="sm" variant="ghost" onClick={() => navigate("/scan")}>
              Beitreten
            </Button>
          </div>

          {communities.length === 0 ? (
            <p className="text-sm text-muted">Noch keiner Community beigetreten.</p>
          ) : (
            <ul className="space-y-2">
              {communities.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <IconUsers width={18} height={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                    <p className="truncate text-xs text-muted">
                      {c.memberCount} Mitglieder
                      {c.context ? ` · ${c.context}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {communities.length > 1 && (
            <p className="mt-3 text-xs text-faint">
              Deine Matches kommen aus allen deinen Communities zusammen.
            </p>
          )}
        </Card>

        <Link to="/styleguide">
          <Card className="flex items-center justify-between p-4 transition-colors hover:bg-surface-2">
            <div>
              <p className="text-sm font-medium text-ink">Styleguide</p>
              <p className="text-sm text-muted">Design-System & Komponenten</p>
            </div>
            <IconArrowRight width={18} height={18} className="text-muted" />
          </Card>
        </Link>

        <div className="pt-2">
          <Badge tone="neutral">CoMatch v0.1 · Dummy-Daten</Badge>
        </div>

        <Button variant="secondary" fullWidth onClick={signOut}>
          Abmelden
        </Button>
      </div>
    </>
  );
}

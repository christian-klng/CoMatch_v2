import { Link, useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppShell";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { CURRENT_COMMUNITY } from "../lib/mockData";
import { IconArrowRight, IconUsers } from "../components/icons";

export function Profile() {
  const navigate = useNavigate();
  return (
    <>
      <ScreenHeader title="Profil" />
      <div className="space-y-4 px-5 py-5">
        <Card className="flex items-center gap-4 p-5">
          <Avatar
            src="https://i.pravatar.cc/240?img=15"
            name="Du"
            size="lg"
          />
          <div className="min-w-0">
            <h2 className="font-semibold text-ink">Christian K.</h2>
            <p className="text-sm text-muted">Founder · CoMatch</p>
            <button className="mt-1 text-sm font-medium text-brand-600">
              Profil bearbeiten
            </button>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <IconUsers width={20} height={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Aktive Community</p>
            <p className="truncate text-sm text-muted">
              {CURRENT_COMMUNITY.name}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate("/scan")}>
            Wechseln
          </Button>
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

        <Button
          variant="secondary"
          fullWidth
          onClick={() => navigate("/login")}
        >
          Abmelden
        </Button>
      </div>
    </>
  );
}

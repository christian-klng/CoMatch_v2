import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppShell";
import { QRScanner } from "../components/QRScanner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Notice } from "../components/ui/Notice";
import { IconArrowRight, IconUsers } from "../components/icons";
import { apiCommunityByCode, apiJoinCommunity } from "../lib/api";
import { refreshCommunities, useMyCommunities } from "../lib/community";
import type { Community } from "../lib/types";

type Phase = "input" | "confirm";

export function Scan() {
  const navigate = useNavigate();
  const { communities } = useMyCommunities();
  const [phase, setPhase] = useState<Phase>("input");
  const [community, setCommunity] = useState<Community | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A scan or manual entry may carry extra characters (e.g. a URL); keep digits.
  const resolve = async (raw: string) => {
    const code = raw.replace(/\D/g, "").slice(0, 8);
    if (code.length !== 8) {
      setError("Bitte gib den 8-stelligen Community-Code ein.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const found = await apiCommunityByCode(code);
      setCommunity(found);
      setPhase("confirm");
    } catch {
      setError("Kein gültiger Community-Code. Prüfe die Ziffern und versuche es erneut.");
    } finally {
      setBusy(false);
    }
  };

  // First community → onboarding (pick skills). Joining an additional one when
  // already onboarded goes straight to the (now larger) match pool.
  const join = async () => {
    if (!community) return;
    const isFirstCommunity = communities.length === 0;
    setBusy(true);
    setError(null);
    try {
      await apiJoinCommunity(community.code);
      // Await the refresh so the community gate sees the new membership before
      // we navigate into a gated route (otherwise it bounces back to /scan).
      await refreshCommunities();
      // First join → LinkedIn step, then skills. Later joins skip straight to matches.
      navigate(isFirstCommunity ? "/connect-linkedin" : "/matches");
    } catch {
      setError("Beitritt fehlgeschlagen. Bitte versuche es erneut.");
      setBusy(false);
    }
  };

  return (
    <>
      <ScreenHeader
        title="Community beitreten"
        subtitle="Scanne den QR-Code oder gib den Code ein"
      />

      <div className="px-5 py-5">
        {phase === "input" && (
          <div className="animate-rise space-y-5">
            <p className="text-[15px] leading-relaxed text-ink-soft">
              Richte die Kamera auf den QR-Code, den du vor Ort findest – oder
              tippe den 8-stelligen Code manuell ein. Nur in deiner Community
              wirst du gematcht.
            </p>
            <QRScanner onResult={resolve} />
            {busy && <p className="text-center text-sm text-muted">Code wird geprüft…</p>}
            {error && <Notice>{error}</Notice>}
          </div>
        )}

        {phase === "confirm" && community && (
          <div className="animate-rise space-y-6 pt-2 text-center">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Bereit zum Beitreten
              </h2>
              <p className="mt-1 text-sm text-muted">
                {communities.length === 0
                  ? "Danach wählst du direkt, was du suchst."
                  : "Du erweiterst damit deinen Match-Pool."}
              </p>
            </div>

            <Card className="p-5 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <IconUsers width={22} height={22} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{community.name}</p>
                  {community.context && (
                    <p className="text-sm text-muted">{community.context}</p>
                  )}
                  <p className="mt-1 text-xs text-faint">
                    {community.memberCount} Mitglieder · Code {community.code}
                  </p>
                </div>
              </div>
            </Card>

            {error && <Notice>{error}</Notice>}

            <div className="space-y-2">
              <Button fullWidth size="lg" disabled={busy} onClick={join}>
                {busy ? "Trete bei…" : "Beitreten & loslegen"}
                {!busy && <IconArrowRight width={18} height={18} />}
              </Button>
              <Button
                fullWidth
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setPhase("input");
                  setCommunity(null);
                  setError(null);
                }}
              >
                Anderen Code eingeben
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

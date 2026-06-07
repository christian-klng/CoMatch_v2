import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppShell";
import { QRScanner } from "../components/QRScanner";
import { Button } from "../components/ui/Button";
import { IconArrowRight, IconCheck, IconUsers } from "../components/icons";
import { CURRENT_COMMUNITY } from "../lib/mockData";

export function Scan() {
  const navigate = useNavigate();
  const [joined, setJoined] = useState(false);

  // Dummy: any scanned/entered code "resolves" to the demo community.
  const handleResult = (_value: string) => setJoined(true);

  return (
    <>
      <ScreenHeader
        title="Community beitreten"
        subtitle="Scanne den QR-Code deines Events"
      />

      <div className="px-5 py-5">
        {!joined ? (
          <div className="animate-rise space-y-5">
            <p className="text-[15px] leading-relaxed text-ink-soft">
              Richte die Kamera auf den QR-Code, den du vor Ort findest. Darüber
              kommst du in die richtige Community – nur dort wirst du gematcht.
            </p>
            <QRScanner onResult={handleResult} />
          </div>
        ) : (
          <div className="animate-rise space-y-6 pt-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
              <IconCheck width={30} height={30} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Willkommen in der Community
              </h2>
              <p className="mt-1 text-sm text-muted">
                Du bist beigetreten – jetzt sag uns, was du suchst.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 text-left shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <IconUsers width={22} height={22} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {CURRENT_COMMUNITY.name}
                  </p>
                  <p className="text-sm text-muted">
                    {CURRENT_COMMUNITY.context}
                  </p>
                  <p className="mt-1 text-xs text-faint">
                    {CURRENT_COMMUNITY.memberCount} Mitglieder
                  </p>
                </div>
              </div>
            </div>

            <Button fullWidth size="lg" onClick={() => navigate("/skills")}>
              Weiter
              <IconArrowRight width={18} height={18} />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

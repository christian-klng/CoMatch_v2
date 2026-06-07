import { useState } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { Button } from "./ui/Button";
import { IconCamera } from "./icons";

/**
 * Camera QR scanner — DELIBERATELY isolated behind this component.
 * Web uses getUserMedia (needs HTTPS or localhost). The Tauri/native build
 * will swap THIS file for a plugin-based scanner; nothing else changes.
 */
export function QRScanner({
  onResult,
}: {
  onResult: (value: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const handleScan = (codes: IDetectedBarcode[]) => {
    const value = codes[0]?.rawValue;
    if (value) onResult(value);
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-ink/90 shadow-lg">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white">
            <IconCamera width={32} height={32} className="opacity-70" />
            <p className="text-sm opacity-80">{error}</p>
          </div>
        ) : (
          <Scanner
            onScan={handleScan}
            onError={() =>
              setError(
                "Kamera nicht verfügbar. Erlaube den Zugriff oder gib den Code manuell ein."
              )
            }
            constraints={{ facingMode: "environment" }}
            components={{ finder: false }}
            styles={{
              container: { width: "100%", height: "100%" },
              video: { objectFit: "cover" },
            }}
          />
        )}

        {/* Reticle overlay */}
        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-52 w-52">
              {(["tl", "tr", "bl", "br"] as const).map((c) => (
                <span
                  key={c}
                  className={cornerClass(c)}
                  style={{ borderColor: "var(--color-brand-400)" }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manual fallback */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-ink-soft">
          Kein QR-Code zur Hand?
        </p>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Community-Code eingeben"
            className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-sm placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <Button
            size="sm"
            disabled={!manual.trim()}
            onClick={() => onResult(manual.trim())}
          >
            Beitreten
          </Button>
        </div>
      </div>
    </div>
  );
}

function cornerClass(corner: "tl" | "tr" | "bl" | "br") {
  const base = "absolute h-7 w-7 border-brand-400";
  const map = {
    tl: "left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-lg",
    tr: "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-lg",
    bl: "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
    br: "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg",
  };
  return `${base} ${map[corner]}`;
}

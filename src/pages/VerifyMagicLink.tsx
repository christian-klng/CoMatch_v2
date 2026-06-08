import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "./AuthShell";
import { verifyMagicLink } from "../lib/auth";

type State = "verifying" | "error";

export function VerifyMagicLink() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>("verifying");
  const ran = useRef(false);

  useEffect(() => {
    // Guard against React 18 StrictMode double-invoke — the token is single-use.
    if (ran.current) return;
    ran.current = true;

    const token = params.get("token");
    if (!token) {
      setState("error");
      return;
    }
    verifyMagicLink(token)
      // Land on matches; the community gate bounces new users to /scan.
      .then(() => navigate("/matches", { replace: true }))
      .catch(() => setState("error"));
  }, [params, navigate]);

  return (
    <AuthShell
      title={state === "error" ? "Link ungültig" : "Anmeldung läuft…"}
      subtitle={
        state === "error"
          ? "Dieser Login-Link ist ungültig oder abgelaufen."
          : "Einen Moment, wir melden dich an."
      }
      footer={
        state === "error" ? (
          <Link to="/login" className="font-medium text-brand-600">
            Neuen Link anfordern
          </Link>
        ) : null
      }
    >
      {state === "verifying" ? (
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        </div>
      ) : (
        <p className="text-sm text-muted">
          Login-Links sind nur 15 Minuten und einmal gültig. Fordere einfach einen neuen an.
        </p>
      )}
    </AuthShell>
  );
}

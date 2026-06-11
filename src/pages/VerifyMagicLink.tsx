import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthShell } from "./AuthShell";
import { Spinner } from "../components/ui/Spinner";
import { verifyMagicLink } from "../lib/auth";

type State = "verifying" | "error";

export function VerifyMagicLink() {
  const { t } = useTranslation();
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
      title={state === "error" ? t("auth.verify.errorTitle") : t("auth.verify.title")}
      subtitle={
        state === "error"
          ? t("auth.verify.errorSubtitle")
          : t("auth.verify.subtitle")
      }
      footer={
        state === "error" ? (
          <Link to="/login" className="font-medium text-brand-600">
            {t("auth.verify.requestNew")}
          </Link>
        ) : null
      }
    >
      {state === "verifying" ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : (
        <p className="text-sm text-muted">{t("auth.verify.hint")}</p>
      )}
    </AuthShell>
  );
}

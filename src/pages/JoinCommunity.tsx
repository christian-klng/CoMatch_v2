import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../lib/auth";
import { setPendingJoinCode } from "../lib/joinCode";

/**
 * Deep-link target for shared/printed community links: /join/<code>.
 * Parks the code in localStorage and routes by auth state — the Scan screen
 * picks the pending code up and jumps straight to the join confirmation.
 * Anonymous visitors register first; the code survives the magic-link
 * round-trip (see VerifyMagicLink).
 */
export function JoinCommunity() {
  const { code: raw } = useParams();
  const navigate = useNavigate();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "loading") return;
    // As tolerant as the in-app scanner: keep only the digits.
    const code = (raw ?? "").replace(/\D/g, "").slice(0, 8);
    if (code.length === 8) setPendingJoinCode(code);
    navigate(status === "authenticated" ? "/scan" : "/register", {
      replace: true,
    });
  }, [status, raw, navigate]);

  return (
    <div className="flex min-h-full items-center justify-center bg-bg">
      <Spinner size="sm" />
    </div>
  );
}

import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../lib/cn";
import { IconSparkles, IconUser, IconUsers } from "./icons";

/**
 * Mobile-first shell. On desktop it renders inside a centered, phone-width
 * frame so the layout always previews the native target. Auth screens render
 * outside this shell (no bottom nav).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto flex min-h-full w-full max-w-[440px] flex-col bg-bg sm:my-0 sm:border-x sm:border-border sm:shadow-lg">
        <main className="flex-1 pb-24">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}

// /scan is reachable via the profile screen ("Beitreten") and as the automatic
// onboarding landing page — it doesn't need a permanent nav slot.
const NAV = [
  { to: "/matches", label: "Matches", Icon: IconSparkles },
  { to: "/skills", label: "Skills", Icon: IconUsers },
  { to: "/profile", label: "Profil", Icon: IconUser },
];

function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[440px] border-t border-border bg-surface/90 backdrop-blur-md">
      <div className="flex items-stretch justify-around px-2 pt-1.5">
        {NAV.map(({ to, label, Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-brand-600" : "text-muted hover:text-ink-soft"
              )}
            >
              <Icon
                className={cn(
                  "transition-transform",
                  active && "scale-110"
                )}
                width={22}
                height={22}
              />
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

/** Reusable screen header with optional back affordance + subtitle. */
export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="safe-top sticky top-0 z-20 border-b border-border bg-bg/85 px-5 pb-3 pt-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-semibold tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}

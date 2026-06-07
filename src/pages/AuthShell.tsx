import type { ReactNode } from "react";
import { IconLogo } from "../components/icons";

/** Centered auth shell with brand lockup and a soft gradient atmosphere. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-bg">
      {/* atmospheric brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[640px] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl"
      />
      <div className="relative mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-6 py-12">
        <div className="animate-rise">
          <div className="mb-8 flex items-center gap-2.5">
            <IconLogo />
            <span className="text-lg font-semibold tracking-tight text-ink">
              CoMatch
            </span>
          </div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-2 text-[15px] text-muted">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
        </div>
      </div>
    </div>
  );
}

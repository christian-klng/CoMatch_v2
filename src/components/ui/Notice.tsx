import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

const tones = {
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
};

/** Inline status message under forms — the app-wide error/success pattern. */
export function Notice({
  tone = "danger",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("rounded-lg px-4 py-3 text-sm", tones[tone], className)}>
      {children}
    </p>
  );
}

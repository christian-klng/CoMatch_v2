import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Tone =
  | "neutral"
  | "brand"
  | "seek"
  | "offer"
  | "success"
  | "warning"
  | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-soft border-border",
  brand: "bg-brand-50 text-brand-700 border-brand-100",
  seek: "bg-[var(--color-seek-soft)] text-[var(--color-seek)] border-transparent",
  offer:
    "bg-[var(--color-offer-soft)] text-[var(--color-offer)] border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

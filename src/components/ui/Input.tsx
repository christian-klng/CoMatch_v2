import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  /** Icon rendered inside the field frame, left of the text. */
  leftIcon?: ReactNode;
  /** Action rendered inside the field frame, right of the text (e.g. a button). */
  rightSlot?: ReactNode;
}

/**
 * The app-wide text field: label + framed input + hint. Focus styles live on
 * the frame (focus-within) so they also wrap icons and right-side actions.
 */
export function Input({
  label,
  hint,
  id,
  className,
  leftIcon,
  rightSlot,
  ...props
}: InputProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-ink-soft">
          {label}
        </span>
      )}
      <div
        className={cn(
          "flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3.5",
          "shadow-xs transition-colors",
          "focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20",
          className
        )}
      >
        {leftIcon && <span className="shrink-0 text-faint">{leftIcon}</span>}
        <input
          id={id}
          className="h-full w-full min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
          {...props}
        />
        {rightSlot}
      </div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

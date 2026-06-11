import { cn } from "../../lib/cn";

/** Brand loading spinner — the single source for all loading indicators. */
export function Spinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-brand-200 border-t-brand-600",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        className
      )}
    />
  );
}

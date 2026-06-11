import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";

const sizes = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  // Signed avatar URLs expire — fall back to initials when the image fails to
  // load (e.g. 403 after expiry) instead of showing a broken-image icon. Reset
  // when the src changes, so the next refresh with a fresh URL retries.
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const base = cn(
    "rounded-full object-cover ring-2 ring-surface shadow-sm",
    sizes[size],
    className,
  );

  if (!src || failed) {
    // No photo (e.g. fresh magic-link user) → initials placeholder.
    return (
      <div
        aria-label={name}
        className={cn(
          base,
          "flex items-center justify-center bg-brand-100 text-sm font-semibold text-brand-700",
        )}
      >
        {initials(name) || "?"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      className={base}
      onError={() => setFailed(true)}
    />
  );
}

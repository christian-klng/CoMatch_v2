import { cn } from "../../lib/cn";

const sizes = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: {
  src: string;
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      className={cn(
        "rounded-full object-cover ring-2 ring-surface shadow-sm",
        sizes[size],
        className
      )}
    />
  );
}

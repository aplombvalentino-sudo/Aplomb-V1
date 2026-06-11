import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "accent" | "champagne" | "success" | "warning" | "danger" | "info";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-ink/[0.06] text-ink-muted",
  accent: "bg-[var(--accent-tint)] text-accent-deep",
  champagne: "bg-[var(--champagne-tint)] text-champagne-deep",
  // Status hues: alpha fills + dark: text lift so they hold on both themes.
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "bg-red-500/10 text-red-700 dark:text-red-300",
  // Info stays in the warm-neutral family — blue is off-palette for the AD.
  info: "bg-stone text-ink-muted",
};

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

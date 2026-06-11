import { cn } from "@/lib/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Adds a quiet hover lift — use for clickable / linked cards only. */
  interactive?: boolean;
};

export function Card({ className, interactive, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        // shadow-card / shadow-float come from the themed elevation tokens in
        // globals.css — they flip with dark mode (deeper, rim-lit) for free.
        "rounded-2xl border border-hairline bg-surface p-6 shadow-card",
        interactive &&
          "transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-float",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex items-start justify-between", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-semibold tracking-tight text-ink", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}

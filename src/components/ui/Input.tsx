import { cn } from "@/lib/cn";
import { forwardRef } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "rounded-xl border border-hairline-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink",
            "placeholder:text-ink-subtle",
            "transition-[border-color,box-shadow] duration-200",
            "focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/5",
            "disabled:bg-surface-raised disabled:text-ink-subtle disabled:cursor-not-allowed",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/10",
            className,
          )}
          {...props}
        />
        {error && <p className="text-[12px] text-red-600">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

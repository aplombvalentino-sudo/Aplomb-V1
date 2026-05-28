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
          <label htmlFor={inputId} className="text-[13px] font-medium text-[#111010]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "rounded-xl border border-black/[0.12] bg-white px-3.5 py-2.5 text-[14px] text-[#111010]",
            "placeholder:text-[#7A7773]",
            "focus:border-[#111010] focus:outline-none focus:ring-1 focus:ring-[#111010]",
            "disabled:bg-[#F7F6F3] disabled:text-[#7A7773] disabled:cursor-not-allowed",
            "transition-colors duration-200",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-[12px] text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

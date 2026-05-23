"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

type CopyButtonProps = {
  text: string;
  className?: string;
  dark?: boolean;
};

export function CopyButton({ text, className, dark }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
        dark
          ? "bg-white/10 text-gray-300 hover:bg-white/20"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200",
        className
      )}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Copied!
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy
        </>
      )}
    </button>
  );
}

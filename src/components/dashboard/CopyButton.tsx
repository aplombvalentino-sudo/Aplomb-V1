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
          ? // sits on a bg-ink code block — on-ink keeps contrast in both themes
            "bg-on-ink/10 text-on-ink/70 hover:bg-on-ink/20 hover:text-on-ink"
          : "bg-surface-raised text-ink-muted hover:bg-stone",
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

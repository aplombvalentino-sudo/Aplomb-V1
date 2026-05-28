"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  TurnstileWidget,
  type TurnstileHandle,
  TURNSTILE_ENABLED,
} from "./TurnstileWidget";

type Status = "idle" | "expired" | "error";

export type TurnstileFieldHandle = { reset: () => void };

/**
 * Reusable Turnstile field for auth forms. Reports the token via `onChange`
 * (token on success, `null` on expiry/error/reset) and shows clean UI states.
 * Parents keep the token in state, include it in the request, and call `reset()`
 * (via ref) if the server rejects it so the user can retry without a refresh.
 *
 * Renders nothing when Turnstile isn't configured (no site key).
 */
export const TurnstileField = forwardRef<
  TurnstileFieldHandle,
  { onChange: (token: string | null) => void; className?: string }
>(function TurnstileField({ onChange, className }, ref) {
  const widgetRef = useRef<TurnstileHandle>(null);
  const [status, setStatus] = useState<Status>("idle");

  useImperativeHandle(ref, () => ({
    reset() {
      widgetRef.current?.reset();
      setStatus("idle");
      onChange(null);
    },
  }));

  if (!TURNSTILE_ENABLED) return null;

  return (
    <div className={className}>
      <TurnstileWidget
        ref={widgetRef}
        onVerify={(t) => {
          setStatus("idle");
          onChange(t);
        }}
        onExpire={() => {
          setStatus("expired");
          onChange(null);
        }}
        onError={() => {
          setStatus("error");
          onChange(null);
        }}
      />
      {status === "expired" && (
        <p className="mt-1.5 text-[12px] text-ink-subtle">
          Verification expired. Please verify again.
        </p>
      )}
      {status === "error" && (
        <p className="mt-1.5 text-[12px] text-red-600">
          Verification failed. Please retry.
        </p>
      )}
    </div>
  );
});

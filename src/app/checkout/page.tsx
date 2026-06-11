"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

// Plans that go through Stripe Checkout. Essential is free (→ /app); Premier is
// sales-led (→ /pricing).
const CHECKOUT_SLUGS = ["listed", "featured", "fashion", "model"];

function CheckoutRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!plan || plan === "essential") {
        router.replace("/app");
        return;
      }
      if (plan === "premier" || plan === "enterprise") {
        router.replace("/pricing");
        return;
      }
      if (!CHECKOUT_SLUGS.includes(plan)) {
        router.replace("/pricing");
        return;
      }
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.success && json.data?.url) {
          window.location.href = json.data.url; // hand off to Stripe Checkout
        } else if (res.status === 401) {
          router.replace(`/login?callbackUrl=/checkout?plan=${plan}`);
        } else {
          setError(json.error?.message ?? "We couldn't start checkout. Please try again.");
        }
      } catch {
        if (!cancelled) setError("We couldn't start checkout. Please try again.");
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [plan, router]);

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="sticky top-0 z-10 border-b border-hairline bg-canvas/90 backdrop-blur-md
                          px-6 py-4 flex items-center justify-between">
        <Link href="/" aria-label="Aplomb — home" className="text-[17px] text-ink hover:opacity-60 transition-opacity">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-[12px] text-ink-subtle">Checkout</span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-24">
        <div className="rounded-3xl border border-hairline bg-surface px-8 py-10 shadow-card text-center">
          {error ? (
            <>
              <h1 className="font-serif italic text-[1.8rem] font-medium text-ink">
                Something went wrong<span className="not-italic text-accent">.</span>
              </h1>
              <p className="mt-3 text-sm text-ink-muted">{error}</p>
              <div className="mt-7 flex flex-col items-center gap-3">
                <Link
                  href="/pricing"
                  className="inline-flex rounded-full bg-ink px-6 py-3 text-sm font-medium text-on-ink hover:bg-ink/90 transition-colors"
                >
                  Back to pricing
                </Link>
                {/* Escape hatch — checkout errors shouldn't strand a signed-in
                    shopper. They can always get back to their wardrobe. */}
                <Link
                  href="/app/wardrobe"
                  className="text-[12px] text-ink-subtle hover:text-ink transition-colors underline underline-offset-2"
                >
                  ← Back to my wardrobe
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-serif italic text-[1.6rem] font-medium text-ink">
                Taking you to secure checkout…
              </h1>
              <p className="mt-2 text-sm text-ink-subtle">Powered by Stripe.</p>
              {/* Skeleton sketch of the order summary Stripe is preparing —
                  designed loading state instead of a spinner. */}
              <div aria-hidden className="mt-8 space-y-3 text-left">
                <div className="h-3 w-2/3 rounded-full bg-ink/5 animate-pulse" />
                <div className="h-3 w-full rounded-full bg-ink/5 animate-pulse" style={{ animationDelay: "120ms" }} />
                <div className="h-3 w-1/2 rounded-full bg-ink/5 animate-pulse" style={{ animationDelay: "240ms" }} />
                <div className="mt-5 flex items-center justify-between border-t border-hairline pt-4">
                  <div className="h-3 w-16 rounded-full bg-ink/5 animate-pulse" style={{ animationDelay: "360ms" }} />
                  <div className="h-3 w-10 rounded-full bg-ink/10 animate-pulse" style={{ animationDelay: "360ms" }} />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutRedirect />
    </Suspense>
  );
}

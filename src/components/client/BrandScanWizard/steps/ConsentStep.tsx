"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ease } from "../helpers";
import { Dot, Arrow } from "../ui";

/**
 * Step 0 — Body-scan privacy + consent + age gate.
 * Start button is disabled until consent + age confirmation + a non-empty
 * product catalog are present (we'd have nothing to size against otherwise).
 *
 * Age 15+ is the French LIL art. 7-1 minimum for digital consent; we apply
 * it equally to the anonymous widget path because the risk surface (body
 * photo of a minor) is the same.
 */
export function ConsentStep({
  consentAccepted,
  setConsentAccepted,
  totalProducts,
  onNext,
}: {
  consentAccepted: boolean;
  setConsentAccepted: (v: boolean) => void;
  totalProducts: number;
  onNext: () => void;
}) {
  // Local — only persisted for the duration of this step. Re-asking on
  // back-nav is acceptable (and arguably better for "demonstrable consent").
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
        Step 1 of 6
      </p>
      <h1 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
        Before we start.
      </h1>
      <p className="mt-3 text-[14px] leading-[1.6] text-ink-muted max-w-[52ch]">
        We&apos;ll take two photos to estimate your body measurements. Photos are
        stored privately, used once for measurement and try-on, and never shared
        with third parties or shown publicly. You can delete your scan at any time.
      </p>

      <ul className="mt-6 space-y-2 text-[13px] text-ink">
        <li className="flex gap-2.5">
          <Dot />
          Photos go to a private storage bucket — never indexed or public.
        </li>
        <li className="flex gap-2.5">
          <Dot />
          Side photo is deleted immediately after measurement; front photo
          is kept only for try-on rendering.
        </li>
        <li className="flex gap-2.5">
          <Dot />
          You control retention — with an account, you can export or erase
          all your data from <span className="font-medium">Account → Your data</span>.
        </li>
      </ul>

      <div className="mt-7 space-y-3">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[#111010]"
          />
          <span className="text-[13px] text-ink leading-[1.5]">
            I agree to the body-scan privacy terms above.
          </span>
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[#111010]"
          />
          <span className="text-[13px] text-ink leading-[1.5]">
            I confirm I am 15 years old or older.
          </span>
        </label>
      </div>

      <div className="mt-8">
        <button
          onClick={onNext}
          disabled={!consentAccepted || !ageConfirmed || totalProducts === 0}
          className="inline-flex items-center gap-2.5 rounded-full bg-[#111010]
                     pl-6 pr-2.5 py-3 text-sm font-medium text-white
                     hover:bg-[#2a2622] transition-all duration-300
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Start
          <Arrow />
        </button>
      </div>
    </motion.section>
  );
}

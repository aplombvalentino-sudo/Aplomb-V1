"use client";

import { motion } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

// Six features framed for streetwear shoppers building rotations. The
// dark "focal" card leads with the rotation-size promise; the rest map to
// the wardrobe → outfit → fit-insight flow.
const features = [
  {
    id: "rotation",
    heading: "Your whole rotation, in one place",
    body: "Snap the hoodies, sneakers, jackets and pants you already own. Add certified streetwear pieces alongside them. Everything you wear, in one digital closet.",
    span: "col-span-1 md:col-span-7 row-span-1",
    dark: true, // ← inverted focal card
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="M8 6V4a4 4 0 0 1 8 0v2" />
      </svg>
    ),
  },
  {
    id: "fits",
    heading: "Test fits before you change",
    body: "Mix sneakers, layers, pants and outerwear in the builder. See the whole look come together before you reach for it.",
    span: "col-span-1 md:col-span-5 row-span-1",
    dark: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.5 6H21l-5 4 2 6-6-4-6 4 2-6-5-4h6.5L12 2z" />
      </svg>
    ),
  },
  {
    id: "capture",
    heading: "Snap any piece, front and back",
    body: "Two photos per item. Lay it flat, capture both sides, add a category and color. The piece is in your rotation in under a minute.",
    span: "col-span-1 md:col-span-4 row-span-1",
    dark: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <circle cx="12" cy="13" r="3.5" />
        <path d="M7 6l1.5-2h7L17 6" />
      </svg>
    ),
  },
  {
    id: "certified",
    heading: "Mix your closet with certified streetwear",
    body: "Browse certified streetwear brands and drop new pieces straight into your rotation. Your stuff, their stuff, one fit.",
    span: "col-span-1 md:col-span-4 row-span-1",
    dark: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: "sync",
    heading: "Cross-device, never lost",
    body: "Your rotation lives on your account, not on one phone. Sign in anywhere and find every piece, every fit, exactly where you left it.",
    span: "col-span-1 md:col-span-4 row-span-1",
    dark: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.7-3" />
        <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3" />
        <polyline points="21 3 21 9 15 9" />
        <polyline points="3 21 3 15 9 15" />
      </svg>
    ),
  },
  {
    id: "fit-insights",
    heading: "Fit insights when you want them",
    body: "Optional sizing support sits in your profile, not in your face. Run a body scan only when you actually want size guidance — never as a price of entry.",
    span: "col-span-1 md:col-span-8 row-span-1",
    dark: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 6H3M18 12H6M15 18H9" />
      </svg>
    ),
  },
];

// Alternate entrance direction per card to break uniform fade-up
const entranceMap: Record<number, { x: number; y: number }> = {
  0: { x: -24, y: 0 },     // slides from left
  1: { x: 24, y: 0 },      // slides from right
  2: { x: 0, y: 28 },      // rises up
  3: { x: 0, y: 28 },      // rises up
  4: { x: 0, y: 28 },      // rises up
  5: { x: -20, y: 16 },    // diagonal from bottom-left
};

export function FeaturesSection() {
  return (
    <section id="features" className="bg-canvas py-32 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center rounded-full border border-hairline bg-surface/60
                           px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
            How it works
          </span>
          <h2 className="mt-5 font-serif text-[clamp(2rem,3.5vw,2.8rem)] font-medium leading-[1.1]
                         tracking-[-0.02em] text-ink [text-wrap:balance]">
            Everything you need to <em className="italic">build a fit</em>
          </h2>
          <p className="mt-4 text-[17px] leading-[1.65] text-ink-muted">
            One closet. Your pieces, certified pieces, every fit you can build with them.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-12 gap-3 auto-rows-auto grid-flow-dense">
          {features.map((f, i) => {
            const dir = entranceMap[i] ?? { x: 0, y: 28 };
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: dir.x, y: dir.y }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.07, ease }}
                whileHover={{ y: -3, transition: { duration: 0.28, ease: "easeOut" } }}
                className={`${f.span} group cursor-default`}
              >
                {/* Outer shell */}
                <div
                  className={`h-full rounded-[1.5rem] p-1.5 ring-1
                              transition-shadow duration-300
                              group-hover:shadow-[0_10px_34px_-12px_rgba(17,16,16,0.16)]
                              ${f.dark
                                ? "bg-stone-deep ring-hairline-strong"
                                : "bg-ink/[0.02] ring-hairline"}`}
                >
                  {/* Inner core */}
                  <div
                    className={`h-full rounded-[calc(1.5rem-0.375rem)] p-7 flex flex-col gap-5
                                ${f.dark ? "bg-stone" : "bg-surface-raised"}`}
                  >
                    {f.dark ? (
                      /* ── Focal stone card — large serif stat + body ── */
                      <>
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl
                                        bg-surface ring-1 ring-hairline text-accent">
                          {f.icon}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <p className="font-serif text-[clamp(2.6rem,5vw,3.8rem)] font-medium
                                          leading-[1] tracking-[-0.03em] text-ink [text-wrap:balance]">
                              {f.heading}
                            </p>
                          </div>
                          <p className="mt-6 max-w-[48ch] text-[14px] leading-[1.65] text-ink-muted">
                            {f.body}
                          </p>
                        </div>
                        {/* Animated accent line — terracotta signature */}
                        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
                          <motion.div
                            initial={{ width: "0%" }}
                            whileInView={{ width: "94%" }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute inset-y-0 left-0 rounded-full bg-accent"
                          />
                        </div>
                      </>
                    ) : (
                      /* ── Light card — standard layout ── */
                      <>
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl
                                        bg-surface ring-1 ring-hairline text-ink-subtle">
                          {f.icon}
                        </div>
                        <h3 className="text-[18px] font-semibold leading-[1.25] tracking-[-0.02em]
                                       text-ink [text-wrap:balance]">
                          {f.heading}
                        </h3>
                        <p className="text-[14px] leading-[1.65] text-ink-muted">
                          {f.body}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

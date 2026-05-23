"use client";

import { motion } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

const features = [
  {
    id: "measurement",
    heading: "15+ body measurements in seconds",
    body: "Shoppers upload a photo or short video. Our AI extracts precise measurements — no tape measure, no size chart guesswork.",
    span: "col-span-1 md:col-span-7 row-span-1",
    dark: true,      // ← inverted card
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 6H3M18 12H6M15 18H9"/>
      </svg>
    ),
  },
  {
    id: "outfits",
    heading: "Complete looks, not just sizes",
    body: "The AI stylist builds outfit combinations from your catalog that fit the shopper's body and match their preferences.",
    span: "col-span-1 md:col-span-5 row-span-1",
    dark: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
  {
    id: "embed",
    heading: "Live in under 10 minutes",
    body: "Drop a single <script> tag onto your product pages. The widget handles everything — no backend changes needed.",
    span: "col-span-1 md:col-span-4 row-span-1",
    dark: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    id: "shopify",
    heading: "Your catalog, always in sync",
    body: "Connect your Shopify store once. Products, variants, and inventory update automatically in the background.",
    span: "col-span-1 md:col-span-4 row-span-1",
    dark: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
  },
  {
    id: "analytics",
    heading: "Know exactly what converts",
    body: "Track fit sessions, outfit clicks, and purchases. See Aplomb's impact on your conversion rate in real time.",
    span: "col-span-1 md:col-span-4 row-span-1",
    dark: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    id: "whitelabel",
    heading: "Your brand, front and centre",
    body: "The widget matches your colours, fonts, and tone. Shoppers never leave your brand experience.",
    span: "col-span-1 md:col-span-8 row-span-1",
    dark: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>
    ),
  },
];

// Alternate entrance direction per card to break uniform fade-up
const entranceMap: Record<number, { x: number; y: number }> = {
  0: { x: -24, y: 0   },   // slides from left
  1: { x:  24, y: 0   },   // slides from right
  2: { x:   0, y: 28  },   // rises up
  3: { x:   0, y: 28  },   // rises up
  4: { x:   0, y: 28  },   // rises up
  5: { x: -20, y: 16  },   // diagonal from bottom-left
};

export function FeaturesSection() {
  return (
    <section id="features" className="bg-[#F7F6F3] py-32 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center rounded-full border border-black/10 bg-white/60
                           px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#9C9894]">
            Platform
          </span>
          <h2 className="mt-5 font-serif text-[clamp(2rem,3.5vw,2.8rem)] font-semibold leading-[1.1]
                         tracking-[-0.025em] text-[#111010] [text-wrap:balance]">
            Everything your brand needs to nail fit
          </h2>
          <p className="mt-4 text-[17px] leading-[1.65] text-[#6B6965]">
            One platform. Zero friction for your shoppers.
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
                              group-hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)]
                              ${f.dark
                                ? "bg-[#0d0c0b] ring-black/40"
                                : "bg-black/[0.025] ring-black/[0.06]"}`}
                >
                  {/* Inner core */}
                  <div
                    className={`h-full rounded-[calc(1.5rem-0.375rem)] p-7 flex flex-col gap-5
                                ${f.dark ? "bg-[#111010]" : "bg-[#F9F8F6]"}`}
                  >
                    {f.dark ? (
                      /* ── Dark card — large serif stat + body ── */
                      <>
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl
                                        bg-white/[0.06] text-white/50">
                          {f.icon}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <p className="font-serif text-[clamp(2.6rem,5vw,3.8rem)] font-semibold
                                          leading-[1] tracking-[-0.04em] text-white [text-wrap:balance]">
                              15+
                            </p>
                            <p className="mt-2 text-[13px] font-medium text-white/40 uppercase tracking-[0.12em]">
                              measurements extracted
                            </p>
                          </div>
                          <p className="mt-6 max-w-[44ch] text-[14px] leading-[1.65] text-white/50">
                            {f.body}
                          </p>
                        </div>
                        {/* Animated scan line — visual life */}
                        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div
                            initial={{ width: "0%" }}
                            whileInView={{ width: "94%" }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute inset-y-0 left-0 rounded-full bg-white/30"
                          />
                        </div>
                      </>
                    ) : (
                      /* ── Light card — standard layout ── */
                      <>
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl
                                        bg-white ring-1 ring-black/[0.07] text-[#6B6965]">
                          {f.icon}
                        </div>
                        <h3 className="text-[18px] font-semibold leading-[1.25] tracking-[-0.02em]
                                       text-[#111010] [text-wrap:balance]">
                          {f.heading}
                        </h3>
                        <p className="text-[14px] leading-[1.65] text-[#6B6965]">
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

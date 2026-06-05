"use client";

// Placeholder brand names — picked to feel broadly contemporary fashion
// (workshop, atelier, label, house) without anchoring to one style culture.
// Swap once real partner brands sign on.
const brands = [
  "Atelier Verdú",
  "Maison Lévigne",
  "Studio 78",
  "Northbound",
  "Form / Function",
  "Coralie & Co.",
  "Edition Neuf",
  "House of Ardent",
  "Linen & Lace",
  "Roussel Paris",
];

export function SocialProofBar() {
  // Duplicate for seamless marquee loop
  const doubled = [...brands, ...brands];

  return (
    <section className="relative overflow-hidden border-y border-hairline bg-canvas py-5">

      <div className="relative overflow-hidden">
        {/* Left / right occlusion masks (functional edge fade for the marquee) */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10
                        bg-gradient-to-r from-canvas to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10
                        bg-gradient-to-l from-canvas to-transparent" />

        {/* Scrolling track */}
        <div className="flex animate-marquee whitespace-nowrap">
          {doubled.map((brand, i) => (
            <span
              key={i}
              className="mx-10 inline-block font-serif italic text-[16px] tracking-[-0.01em]
                         text-ink-muted/75 select-none"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

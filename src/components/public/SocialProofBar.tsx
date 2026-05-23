"use client";

const brands = [
  "Maison Verdú",
  "Atelier Noir",
  "Studio Lumière",
  "Forme Paris",
  "Velour House",
  "Cerise Label",
  "Arc & Thread",
  "Nuance Studio",
  "Toile Collective",
  "Blanc Saisonnier",
];

export function SocialProofBar() {
  // Duplicate for seamless marquee loop
  const doubled = [...brands, ...brands];

  return (
    <section className="relative overflow-hidden border-y border-black/[0.06] bg-[#F7F6F3] py-5">

      <div className="relative overflow-hidden">
        {/* Left / right fade masks */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10
                        bg-gradient-to-r from-[#F7F6F3] to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10
                        bg-gradient-to-l from-[#F7F6F3] to-transparent" />

        {/* Scrolling track */}
        <div className="flex animate-marquee whitespace-nowrap">
          {doubled.map((brand, i) => (
            <span
              key={i}
              className="mx-10 inline-block text-[15px] font-semibold tracking-[-0.02em]
                         text-[#6B6965]/70 select-none"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

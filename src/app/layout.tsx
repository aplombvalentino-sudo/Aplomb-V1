import type { Metadata, Viewport } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";

// Neutral grotesque for UI + body.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// The editorial voice: a modern variable serif with true italics and optical
// sizing. The only display face in the system.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

const SITE_URL = process.env.NEXTAUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// ─────────────────────────────────────────────────────────────────────────────
// Metadata — wardrobe-first positioning.
//
// Everything that bleeds into SERPs / share previews / OS install prompts
// lives here. Per-page exports (e.g. /pricing, /signup) override the title
// via the `%s | Aplomb` template; the description / OG / Twitter copy in
// this default is what unindexed inner pages fall back to.
//
// IMPORTANT: do NOT revert this to a sizing- or fitting-room-first headline.
// The product is sold as a digital wardrobe; sizing is the secondary layer.
// See docs/PRODUCT_DIRECTION.md for the canonical positioning.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aplomb — Digital Wardrobe & Outfit Tester",
    template: "%s | Aplomb",
  },
  description:
    "Build your digital wardrobe. Add the clothes you already own, mix them with certified brand pieces, and try new outfits on yourself before you change.",
  applicationName: "Aplomb",
  keywords: [
    "digital wardrobe",
    "outfit planner",
    "virtual closet",
    "outfit ideas",
    "try outfits on yourself",
    "wardrobe app",
    "fashion app",
    "personal stylist",
    "what to wear",
  ],
  authors: [{ name: "Aplomb" }],
  creator: "Aplomb",
  publisher: "Aplomb",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Aplomb",
    title: "Aplomb — Digital Wardrobe & Outfit Tester",
    description:
      "Build your digital wardrobe, mix the clothes you own with certified brand pieces, and try new outfits on yourself before you change.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Aplomb — your digital wardrobe",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aplomb — Digital Wardrobe & Outfit Tester",
    description:
      "Build your digital wardrobe and try new outfits on yourself before you change.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Google Search Console verification — set GOOGLE_SITE_VERIFICATION in
  // Vercel env once the property is added in Search Console. Empty string
  // means no <meta name="google-site-verification"> tag is emitted.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#F6F3EE",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// JSON-LD structured data
//
// Two top-level entities baked into every page:
//   1. Organization — feeds the Google knowledge panel.
//   2. WebSite — enables the Sitelinks search box in SERPs.
//
// Kept as plain literals (no Date.now() / no random) so static rendering
// stays deterministic and the harness's serialization is stable.
// ─────────────────────────────────────────────────────────────────────────────

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Aplomb",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description:
    "Aplomb is a digital wardrobe app. Add the clothes you already own, mix them with certified brand pieces, and try new outfits on yourself before you change.",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Aplomb",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/pricing?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="grain-overlay min-h-full flex flex-col overflow-x-hidden" suppressHydrationWarning>
        {/* Structured data — inlined as <script> so it lands in the static
            payload without an extra hydration cost. CSP nonce-based policy
            in middleware.ts allows inline JSON-LD via type="application/ld+json"
            (which the CSP `script-src` excludes by spec). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}

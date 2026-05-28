import type { Metadata } from "next";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aplomb — AI Fitting Room for Fashion Brands",
    template: "%s | Aplomb",
  },
  description:
    "Give your shoppers accurate size recommendations and complete outfit suggestions powered by AI body measurement — built to reduce returns and increase conversion.",
  keywords: ["AI fitting room", "size recommendation", "fashion tech", "outfit suggestion", "reduce returns"],
  authors: [{ name: "Aplomb" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Aplomb",
    title: "Aplomb — AI Fitting Room for Fashion Brands",
    description:
      "Give your shoppers accurate size recommendations and complete outfit suggestions. Reduce returns, increase conversion.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Aplomb — AI Fitting Room",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aplomb — AI Fitting Room for Fashion Brands",
    description: "Give your shoppers accurate size recommendations and complete outfit suggestions.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
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
        {children}
      </body>
    </html>
  );
}
